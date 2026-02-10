#!/bin/bash
# Replay Phase 5 for an optimization run using direct SQL
# This script connects to Supabase to update the run with Phase 5 results

set -e

RUN_ID="${1:-}"

if [ -z "$RUN_ID" ]; then
    echo "Usage: $0 <run_id>"
    echo "Example: $0 2e919950-e451-4cad-bcd0-4df762a2d7fb"
    exit 1
fi

echo "🔍 Replaying Phase 5 for run: $RUN_ID"

# Supabase connection details (from environment or defaults)
SUPABASE_URL="${SUPABASE_URL:-https://kxshyoaxjkwvcdmjrfxz.supabase.co}"
SUPABASE_KEY="${SUPABASE_SERVICE_KEY:-}"

if [ -z "$SUPABASE_KEY" ]; then
    echo "❌ ERROR: SUPABASE_SERVICE_KEY environment variable is required"
    echo "Set it with: export SUPABASE_SERVICE_KEY='your-key'"
    exit 1
fi

# Step 1: Get variation results
echo "📊 Fetching Phase 4 results..."

RESULTS=$(curl -s "$SUPABASE_URL/rest/v1/eval_opt_run_results?run_id=eq.$RUN_ID&select=variation_name,result_type" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY")

RESULT_COUNT=$(echo "$RESULTS" | jq '. | length')

if [ "$RESULT_COUNT" -eq "0" ]; then
    echo "❌ ERROR: No Phase 4 results found for run $RUN_ID"
    echo "Phase 4 may not have completed successfully."
    exit 1
fi

echo "✅ Found $RESULT_COUNT evaluation results"

# Step 2: Calculate variation summaries using jq
echo "🔄 Calculating variation accuracies..."

VARIATION_SUMMARY=$(echo "$RESULTS" | jq -r '
    group_by(.variation_name) | 
    map({
        variation_name: .[0].variation_name,
        true_positives: map(select(.result_type == "true_positive")) | length,
        false_positives: map(select(.result_type == "false_positive")) | length,
        true_negatives: map(select(.result_type == "true_negative")) | length,
        false_negatives: map(select(.result_type == "false_negative")) | length
    }) |
    map(. + {
        accuracy: (((.true_positives + .true_negatives) / (.true_positives + .false_positives + .true_negatives + .false_negatives)) * 100)
    })
')

echo "$VARIATION_SUMMARY" | jq -r '.[] | "  \(.variation_name): \(.accuracy | tostring | .[0:5])% accuracy"'

# Step 3: Find best variation
BEST_VARIATION=$(echo "$VARIATION_SUMMARY" | jq -r 'max_by(.accuracy) | .variation_name')
BEST_ACCURACY=$(echo "$VARIATION_SUMMARY" | jq -r 'max_by(.accuracy) | .accuracy')

echo ""
echo "🏆 Best variation: $BEST_VARIATION ($BEST_ACCURACY%)"

# Step 4: Generate simple recommendations
RECOMMENDATIONS='[
  {
    "type": "best_variation",
    "title": "Use '"$BEST_VARIATION"' prompt",
    "description": "This variation achieved '"$BEST_ACCURACY"'% accuracy.",
    "priority": "high"
  }
]'

# Step 5: Build prompt_variations array with full stats
# Use default temperature/max_tokens since config may not be available
echo ""
echo "📋 Building prompt variations..."

PROMPT_VARIATIONS=$(echo "$VARIATION_SUMMARY" | jq '
    map({
        name: .variation_name,
        accuracy: (.accuracy / 100),
        temperature: 0.7,
        max_tokens: 2000,
        true_positive: .true_positives,
        true_negative: .true_negatives,
        false_positive: .false_positives,
        false_negative: .false_negatives
    })
')

TOTAL_VARIATIONS=$(echo "$PROMPT_VARIATIONS" | jq 'length')

echo "✅ Found $TOTAL_VARIATIONS variations"

# Step 6: Get truth set results (per-document accuracy)
# Note: doc_group_id may not be available in older runs, so we default to empty array
echo "📄 Calculating truth set results..."

# Check if doc_group_id exists by attempting the query
DOC_GROUPS=$(curl -s "$SUPABASE_URL/rest/v1/eval_opt_run_results?run_id=eq.$RUN_ID&select=doc_group_id,variation_name,result_type" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" 2>/dev/null || echo "[]")

# Check if doc_group_id exists in the response
HAS_DOC_GROUPS=$(echo "$DOC_GROUPS" | jq 'if type == "array" and length > 0 then (.[0] | has("doc_group_id")) else false end')

if [ "$HAS_DOC_GROUPS" = "true" ]; then
    # Get unique doc groups
    DOC_GROUP_IDS=$(echo "$DOC_GROUPS" | jq -r '[.[].doc_group_id] | unique | join(",")')
    
    if [ -n "$DOC_GROUP_IDS" ] && [ "$DOC_GROUP_IDS" != "null" ]; then
        DOC_INFO=$(curl -s "$SUPABASE_URL/rest/v1/eval_opt_doc_groups?id=in.($DOC_GROUP_IDS)&select=id,doc_id,doc_name" \
            -H "apikey: $SUPABASE_KEY" \
            -H "Authorization: Bearer $SUPABASE_KEY" 2>/dev/null || echo "[]")
        
        # Calculate per-document accuracy
        TRUTH_SET_RESULTS=$(echo "$DOC_GROUPS" | jq --argjson docinfo "$DOC_INFO" '
            group_by(.doc_group_id) |
            map({
                doc_group_id: .[0].doc_group_id,
                total: length,
                correct: (map(select(.result_type == "true_positive" or .result_type == "true_negative")) | length)
            }) |
            map(. as $stats |
                ($docinfo | map(select(.id == $stats.doc_group_id)) | .[0]) as $doc |
                {
                    document_name: ($doc.doc_name // "Unknown Document"),
                    document_id: ($doc.doc_id // ""),
                    accuracy: ($stats.correct / $stats.total),
                    total_criteria: $stats.total,
                    correct_evaluations: $stats.correct
                }
            )
        ' 2>/dev/null || echo '[]')
    else
        TRUTH_SET_RESULTS='[]'
    fi
else
    echo "⚠️  doc_group_id not available in results (older run format)"
    TRUTH_SET_RESULTS='[]'
fi

echo "✅ Truth set results: $(echo "$TRUTH_SET_RESULTS" | jq 'length') documents"

# Step 7: Build complete results object
RESULTS_OBJECT=$(jq -n \
    --argjson overall_accuracy "$(echo "$BEST_ACCURACY" | jq '. / 100')" \
    --arg best_variation "$BEST_VARIATION" \
    --argjson total_variations "$TOTAL_VARIATIONS" \
    --argjson recommendations "$RECOMMENDATIONS" \
    --argjson prompt_variations "$PROMPT_VARIATIONS" \
    --argjson truth_set_results "$TRUTH_SET_RESULTS" \
    '{
        overall_accuracy: $overall_accuracy,
        best_variation: $best_variation,
        total_variations_tested: $total_variations,
        recommendations: $recommendations,
        prompt_variations: $prompt_variations,
        truth_set_results: $truth_set_results
    }')

# Step 8: Update run record with complete results
echo ""
echo "💾 Updating run record with complete results..."

UPDATE_RESPONSE=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/eval_opt_runs?id=eq.$RUN_ID" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{
        \"status\": \"completed\",
        \"progress\": 100,
        \"progress_message\": \"Optimization complete (Phase 5 replayed)\",
        \"best_variation\": \"$BEST_VARIATION\",
        \"overall_accuracy\": $(echo "$BEST_ACCURACY" | jq '. / 100'),
        \"results\": $RESULTS_OBJECT,
        \"completed_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"
    }")

# Step 9: Mark Phase 5 as complete
echo "✅ Marking Phase 5 as complete..."

curl -s -X PATCH "$SUPABASE_URL/rest/v1/eval_opt_run_phases?run_id=eq.$RUN_ID&phase_number=eq.5" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{
        \"status\": \"complete\",
        \"completed_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\",
        \"error_message\": null
    }" > /dev/null

echo ""
echo "✅ Phase 5 replay complete!"
echo "🎯 Best variation: $BEST_VARIATION"
echo "📈 Overall accuracy: $BEST_ACCURACY%"
echo ""
echo "Check the UI to see results."