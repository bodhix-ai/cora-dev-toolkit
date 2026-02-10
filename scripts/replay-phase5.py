#!/usr/bin/env python3
"""
Replay Phase 5 (Analysis & Recommendations) for an optimization run.

This script uses existing Phase 4 results to complete Phase 5 without
re-running expensive AI evaluations. Useful when Phase 5 fails due to
bugs after Phase 4 completed successfully.

Usage:
    python3 scripts/replay-phase5.py <run_id>

Example:
    python3 scripts/replay-phase5.py 2e919950-e451-4cad-bcd0-4df762a2d7fb
"""

import json
import sys
import os
from datetime import datetime, timezone
from decimal import Decimal

# Add path for org_common
sys.path.insert(0, '/opt/python')

# For local testing, mock org_common if not available
try:
    import org_common as common
except ImportError:
    print("Warning: org_common not available, using mock")
    class MockCommon:
        def find_many(self, table, query, **kwargs):
            return []
        def find_one(self, table, query):
            return None
        def update_one(self, table, query, data):
            print(f"UPDATE {table} SET {data} WHERE {query}")
            return True
    common = MockCommon()


def replay_phase5(run_id: str) -> None:
    """
    Replay Phase 5 using existing Phase 4 results.
    """
    print(f"Replaying Phase 5 for run {run_id}...")
    
    # 1. Get run record
    run = common.find_one('eval_opt_runs', {'id': run_id})
    if not run:
        print(f"ERROR: Run {run_id} not found")
        return
    
    print(f"Run: {run.get('name')} - Status: {run.get('status')}")
    
    # 2. Get Phase 4 results
    results = common.find_many('eval_opt_run_results', {'run_id': run_id})
    if not results:
        print(f"ERROR: No results found for run {run_id}")
        print("Phase 4 may not have completed successfully.")
        return
    
    print(f"Found {len(results)} evaluation results from Phase 4")
    
    # 3. Calculate variation summaries
    variations = {}
    for result in results:
        var_name = result.get('variation_name')
        if var_name not in variations:
            variations[var_name] = {
                'variation_name': var_name,
                'strategy': 'unknown',  # We don't have this stored
                'true_positives': 0,
                'false_positives': 0,
                'true_negatives': 0,
                'false_negatives': 0
            }
        
        # Count result types
        result_type = result.get('result_type', '').lower()
        if result_type == 'true_positive':
            variations[var_name]['true_positives'] += 1
        elif result_type == 'false_positive':
            variations[var_name]['false_positives'] += 1
        elif result_type == 'true_negative':
            variations[var_name]['true_negatives'] += 1
        elif result_type == 'false_negative':
            variations[var_name]['false_negatives'] += 1
    
    # Calculate accuracy for each variation
    variation_results = []
    for var_name, var_data in variations.items():
        total = sum([
            var_data['true_positives'],
            var_data['false_positives'],
            var_data['true_negatives'],
            var_data['false_negatives']
        ])
        correct = var_data['true_positives'] + var_data['true_negatives']
        var_data['accuracy'] = (correct / total * 100) if total > 0 else 0
        variation_results.append(var_data)
        print(f"  {var_name}: {var_data['accuracy']:.1f}% accuracy ({correct}/{total} correct)")
    
    if not variation_results:
        print("ERROR: No variations found in results")
        return
    
    # 4. Find best variation
    best_variation = max(variation_results, key=lambda x: x['accuracy'])
    print(f"\nBest variation: {best_variation['variation_name']} ({best_variation['accuracy']:.1f}%)")
    
    # 5. Generate simple recommendations (without full domain knowledge)
    recommendations = []
    
    # Sort variations by accuracy
    sorted_vars = sorted(variation_results, key=lambda x: x['accuracy'], reverse=True)
    
    # Recommendation 1: Best variation
    recommendations.append({
        'type': 'best_variation',
        'title': f"Use {best_variation['variation_name']} prompt",
        'description': f"This variation achieved {best_variation['accuracy']:.1f}% accuracy, outperforming {len(variation_results) - 1} other variations.",
        'priority': 'high'
    })
    
    # Recommendation 2: Improvement opportunity
    if best_variation['accuracy'] < 90:
        recommendations.append({
            'type': 'improvement',
            'title': "Room for improvement",
            'description': f"Current best accuracy is {best_variation['accuracy']:.1f}%. Consider adding more context documents or refining criteria.",
            'priority': 'medium'
        })
    
    # Recommendation 3: Variation comparison
    if len(sorted_vars) >= 2:
        second_best = sorted_vars[1]
        diff = best_variation['accuracy'] - second_best['accuracy']
        recommendations.append({
            'type': 'comparison',
            'title': f"Close alternative: {second_best['variation_name']}",
            'description': f"Second-best variation achieved {second_best['accuracy']:.1f}% accuracy (only {diff:.1f}% lower).",
            'priority': 'low'
        })
    
    print(f"\nGenerated {len(recommendations)} recommendations")
    
    # 6. Update run record
    print("\nUpdating run record...")
    update_data = {
        'status': 'completed',
        'progress': 100,
        'progress_message': 'Optimization complete (Phase 5 replayed)',
        'best_variation': best_variation['variation_name'],
        'overall_accuracy': Decimal(str(round(best_variation['accuracy'], 2))),
        'recommendations': json.dumps(recommendations, default=str),
        'variation_summary': json.dumps(variation_results, default=str),
        'completed_at': datetime.now(timezone.utc).isoformat()
    }
    
    common.update_one('eval_opt_runs', {'id': run_id}, update_data)
    
    # 7. Mark Phase 5 as complete
    phase5 = common.find_one('eval_opt_run_phases', {
        'run_id': run_id,
        'phase_number': 5
    })
    
    if phase5:
        common.update_one('eval_opt_run_phases', {'id': phase5['id']}, {
            'status': 'complete',
            'completed_at': datetime.now(timezone.utc).isoformat(),
            'error_message': None
        })
        print("Marked Phase 5 as complete")
    
    print(f"\n✅ Phase 5 replay complete!")
    print(f"Best variation: {best_variation['variation_name']}")
    print(f"Overall accuracy: {best_variation['accuracy']:.1f}%")
    print(f"\nCheck the UI to see results.")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    run_id = sys.argv[1]
    replay_phase5(run_id)