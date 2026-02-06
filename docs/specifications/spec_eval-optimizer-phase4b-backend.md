# Specification: Eval Optimizer Phase 4B-D Backend

**Status:** 📋 DESIGN  
**Created:** February 5, 2026  
**Sprint:** eval-optimization-s2  
**Branch:** `feature/eval-optimization-s2`

---

## Executive Summary

This specification defines the backend architecture for the **automated prompt optimization system**. The system automatically generates domain-aware prompts using RAG + LLM meta-prompting, tests multiple variations, and provides recommendations for improvement.

**Key Innovation:** The system generates prompts, not the BA. BAs provide:
1. Context documents (domain standards, guides)
2. Truth keys (manual evaluations)
3. Response structure (desired output format)

The system uses these to automatically generate and test domain-aware prompts.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       OPTIMIZATION RUN FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐   │
│  │   Context    │    │   Response   │    │      Truth Keys          │   │
│  │  Documents   │───▶│  Structure   │───▶│  (Manual Evaluations)    │   │
│  │  (module-kb) │    │  (JSON def)  │    │  (from Phase 3)          │   │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘   │
│         │                   │                        │                   │
│         ▼                   ▼                        ▼                   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    RAG PIPELINE                                   │   │
│  │  • Extract key concepts from context docs via module-kb           │   │
│  │  • Build domain knowledge summary                                 │   │
│  │  • Identify standards, terminology, requirements                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                  LLM META-PROMPTER                                │   │
│  │  • Generate domain-aware evaluation prompts                       │   │
│  │  • Use RAG knowledge + response structure                         │   │
│  │  • Configurable LLM (from ai_models table)                        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                  VARIATION GENERATOR                              │   │
│  │  • Create 5-12 prompt variations based on thoroughness            │   │
│  │  • Variations: evidence-focused, standard-focused, risk-focused   │   │
│  │  • Temperature/token variations                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                OPTIMIZATION ORCHESTRATOR                          │   │
│  │  For each prompt variation:                                       │   │
│  │    1. Call module-eval with generated prompt                      │   │
│  │    2. Compare AI results to truth keys                            │   │
│  │    3. Calculate accuracy metrics (TP/TN/FP/FN)                    │   │
│  │    4. Store results in eval_opt_run_results                       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                 RECOMMENDATION ENGINE                             │   │
│  │  • Analyze results across all variations                          │   │
│  │  • Identify best configuration                                    │   │
│  │  • Generate actionable recommendations                            │   │
│  │  • "Add 7 more truth sets for +10% accuracy"                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. RAG Pipeline (uses existing module-kb)

**Purpose:** Extract domain knowledge from context documents uploaded to workspace KB.

**Key Constraint:** Module-kb is the ONLY RAG provider. NO new vector infrastructure.

```python
class RAGPipeline:
    """
    Extract domain knowledge from context documents.
    Uses existing module-kb APIs - no new infrastructure.
    """
    
    def extract_domain_knowledge(
        self,
        ws_id: str,
        context_doc_ids: List[str]
    ) -> DomainKnowledge:
        """
        Extract key concepts, standards, and terminology from context docs.
        
        Implementation:
        1. Get document content from kb_docs table
        2. Get relevant chunks from kb_chunks table
        3. Use LLM to summarize domain concepts
        4. Return structured DomainKnowledge object
        """
        pass
    
    def get_relevant_context(
        self,
        ws_id: str,
        query: str,
        doc_ids: List[str],
        limit: int = 10
    ) -> str:
        """
        Get relevant context for a query using RAG search.
        Uses existing module-kb chunk retrieval.
        """
        pass
```

**Integration Points:**
- `kb_docs` table: Document metadata and extracted text
- `kb_chunks` table: Document chunks for RAG retrieval
- Existing module-kb APIs (no new endpoints needed)

### 2. LLM Meta-Prompter

**Purpose:** Generate domain-aware evaluation prompts using RAG knowledge.

**Configurable LLM:** Uses same pattern as module-eval - configurable via `ai_providers` and `ai_models` tables.

```python
class MetaPrompter:
    """
    Generate domain-aware prompts using LLM.
    LLM selection is configurable at system/org level.
    """
    
    def generate_base_prompt(
        self,
        domain_knowledge: DomainKnowledge,
        response_structure: Dict[str, Any],
        criteria_items: List[Dict[str, Any]],
        config: OptimizationConfig
    ) -> str:
        """
        Generate a domain-aware evaluation prompt.
        
        Uses configurable LLM from ai_models table.
        """
        # Get configured LLM for meta-prompting
        provider_id = config.meta_prompt_provider_id
        model_id = config.meta_prompt_model_id
        
        # Build meta-prompt
        meta_prompt = f"""
        You are an expert prompt engineer specializing in document evaluation.
        
        DOMAIN KNOWLEDGE:
        {domain_knowledge.to_text()}
        
        RESPONSE STRUCTURE REQUIRED:
        {json.dumps(response_structure, indent=2)}
        
        CRITERIA TO EVALUATE:
        {format_criteria(criteria_items)}
        
        Generate an evaluation prompt that:
        1. References specific domain standards from the knowledge
        2. Produces output matching the response structure
        3. Evaluates each criterion with domain-specific context
        4. Includes guidance for finding evidence/citations
        
        Output the complete evaluation prompt.
        """
        
        # Call LLM via existing module-ai pattern
        response = call_ai_provider(
            provider_id=provider_id,
            model_id=model_id,
            system_prompt="You generate evaluation prompts.",
            user_prompt=meta_prompt,
            temperature=0.7,  # Higher temp for creativity
            max_tokens=4000
        )
        
        return response
```

### 3. Variation Generator

**Purpose:** Create multiple prompt variations for A/B testing.

```python
class VariationGenerator:
    """
    Generate prompt variations for optimization testing.
    """
    
    VARIATION_STRATEGIES = {
        'evidence_focused': {
            'description': 'Emphasizes finding and citing evidence',
            'temperature_mod': 0.0,
            'prompt_prefix': 'Focus on finding specific evidence and quotes...'
        },
        'standard_focused': {
            'description': 'Emphasizes compliance with standards',
            'temperature_mod': -0.1,
            'prompt_prefix': 'Strictly evaluate against the defined standards...'
        },
        'risk_focused': {
            'description': 'Emphasizes identifying risks and gaps',
            'temperature_mod': 0.1,
            'prompt_prefix': 'Pay particular attention to risks and compliance gaps...'
        },
        'conservative': {
            'description': 'Lower temperature, stricter interpretation',
            'temperature_mod': -0.2,
            'prompt_prefix': 'Apply strict interpretation of requirements...'
        },
        'balanced': {
            'description': 'Balanced approach',
            'temperature_mod': 0.0,
            'prompt_prefix': ''
        },
        'comprehensive': {
            'description': 'More detailed analysis',
            'temperature_mod': 0.1,
            'prompt_prefix': 'Provide comprehensive analysis...',
            'max_tokens_mod': 500
        }
    }
    
    def generate_variations(
        self,
        base_prompt: str,
        base_config: PromptConfig,
        thoroughness: str  # 'fast', 'balanced', 'thorough'
    ) -> List[PromptVariation]:
        """
        Generate prompt variations based on thoroughness setting.
        
        Thoroughness levels:
        - fast: 5 variations
        - balanced: 7 variations
        - thorough: 12 variations
        """
        num_variations = {
            'fast': 5,
            'balanced': 7,
            'thorough': 12
        }.get(thoroughness, 7)
        
        variations = []
        strategies = list(self.VARIATION_STRATEGIES.keys())
        
        for i in range(num_variations):
            strategy_name = strategies[i % len(strategies)]
            strategy = self.VARIATION_STRATEGIES[strategy_name]
            
            variation = PromptVariation(
                name=f"variation_{i+1}_{strategy_name}",
                strategy=strategy_name,
                system_prompt=base_prompt,
                user_prompt_prefix=strategy.get('prompt_prefix', ''),
                temperature=max(0.0, min(1.0, base_config.temperature + strategy.get('temperature_mod', 0))),
                max_tokens=base_config.max_tokens + strategy.get('max_tokens_mod', 0)
            )
            variations.append(variation)
        
        return variations
```

### 4. Optimization Orchestrator

**Purpose:** Run evaluations with each prompt variation and compare to truth keys.

```python
class OptimizationOrchestrator:
    """
    Main orchestrator for optimization runs.
    """
    
    def run_optimization(
        self,
        run_id: str,
        ws_id: str,
        config: OptimizationConfig
    ) -> OptimizationResult:
        """
        Execute a complete optimization run.
        
        Steps:
        1. Load context documents and build domain knowledge (RAG)
        2. Load response structure definition
        3. Generate base prompt via meta-prompter
        4. Generate prompt variations
        5. For each variation:
           a. Run evaluation on all sample documents
           b. Compare results to truth keys
           c. Calculate metrics
        6. Identify best configuration
        7. Generate recommendations
        """
        
        # Update run status
        update_run_status(run_id, 'processing', 0)
        
        try:
            # Load configuration
            run = get_run(run_id)
            context_doc_ids = run.get('context_doc_ids', [])
            response_structure_id = run.get('response_structure_id')
            thoroughness = run.get('thoroughness', 'balanced')
            
            # ============================================
            # PHASE 1: Domain Knowledge Extraction (0-10%)
            # ============================================
            update_run_status(run_id, 'processing', 5, 'Extracting domain knowledge...')
            
            rag_pipeline = RAGPipeline()
            domain_knowledge = rag_pipeline.extract_domain_knowledge(
                ws_id=ws_id,
                context_doc_ids=context_doc_ids
            )
            
            # ============================================
            # PHASE 2: Prompt Generation (10-20%)
            # ============================================
            update_run_status(run_id, 'processing', 15, 'Generating prompts...')
            
            response_structure = get_response_structure(response_structure_id)
            criteria_items = get_criteria_items(ws_id)
            
            meta_prompter = MetaPrompter(config)
            base_prompt = meta_prompter.generate_base_prompt(
                domain_knowledge=domain_knowledge,
                response_structure=response_structure,
                criteria_items=criteria_items,
                config=config
            )
            
            # ============================================
            # PHASE 3: Variation Generation (20-25%)
            # ============================================
            update_run_status(run_id, 'processing', 22, 'Creating variations...')
            
            variation_generator = VariationGenerator()
            variations = variation_generator.generate_variations(
                base_prompt=base_prompt,
                base_config=config.prompt_config,
                thoroughness=thoroughness
            )
            
            # Save generated prompts
            save_generated_prompts(run_id, variations)
            
            # ============================================
            # PHASE 4: Evaluation Loop (25-85%)
            # ============================================
            # Get all sample document groups with truth keys
            doc_groups = get_evaluated_doc_groups(ws_id)
            
            total_evaluations = len(variations) * len(doc_groups)
            completed = 0
            
            variation_results = []
            
            for var_idx, variation in enumerate(variations):
                var_result = VariationResult(
                    variation_name=variation.name,
                    strategy=variation.strategy
                )
                
                for group in doc_groups:
                    # Calculate progress
                    progress = 25 + int((completed / total_evaluations) * 60)
                    update_run_status(
                        run_id, 'processing', progress,
                        f'Testing {variation.name} on sample {group["name"]}...'
                    )
                    
                    # Run evaluation with this variation's prompt
                    ai_results = run_evaluation_with_prompt(
                        ws_id=ws_id,
                        doc_group=group,
                        variation=variation,
                        config=config
                    )
                    
                    # Get truth keys for this document group
                    truth_keys = get_truth_keys(group['id'])
                    
                    # Compare results
                    comparison = compare_to_truth_keys(
                        ai_results=ai_results,
                        truth_keys=truth_keys
                    )
                    
                    # Save individual results
                    save_run_result(
                        run_id=run_id,
                        variation_name=variation.name,
                        doc_group_id=group['id'],
                        comparison=comparison
                    )
                    
                    var_result.add_comparison(comparison)
                    completed += 1
                
                # Calculate metrics for this variation
                var_result.calculate_metrics()
                variation_results.append(var_result)
            
            # ============================================
            # PHASE 5: Analysis & Recommendations (85-100%)
            # ============================================
            update_run_status(run_id, 'processing', 90, 'Analyzing results...')
            
            # Find best variation
            best_variation = max(variation_results, key=lambda x: x.accuracy)
            
            # Generate recommendations
            recommendation_engine = RecommendationEngine()
            recommendations = recommendation_engine.generate(
                variation_results=variation_results,
                doc_groups=doc_groups,
                domain_knowledge=domain_knowledge
            )
            
            # ============================================
            # FINAL: Save Results
            # ============================================
            update_run_completed(
                run_id=run_id,
                best_variation=best_variation.variation_name,
                overall_accuracy=best_variation.accuracy,
                recommendations=recommendations,
                variation_results=variation_results
            )
            
            return OptimizationResult(
                success=True,
                best_variation=best_variation,
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.exception(f"Optimization run failed: {e}")
            mark_run_failed(run_id, str(e))
            return OptimizationResult(success=False, error=str(e))
```

### 5. Recommendation Engine

**Purpose:** Analyze results and generate actionable recommendations.

```python
class RecommendationEngine:
    """
    Generate actionable recommendations from optimization results.
    """
    
    def generate(
        self,
        variation_results: List[VariationResult],
        doc_groups: List[Dict[str, Any]],
        domain_knowledge: DomainKnowledge
    ) -> List[Recommendation]:
        """
        Generate recommendations based on optimization results.
        """
        recommendations = []
        
        best = max(variation_results, key=lambda x: x.accuracy)
        
        # ========================================
        # Sample Size Recommendations
        # ========================================
        sample_count = len(doc_groups)
        
        if sample_count < 5:
            recommendations.append(Recommendation(
                type='sample_size',
                priority='high',
                title='Add More Sample Documents',
                description=f'You have {sample_count} samples. Add at least {10 - sample_count} more for reliable optimization.',
                impact_estimate='+15-25% confidence'
            ))
        elif sample_count < 15:
            additional_needed = 15 - sample_count
            recommendations.append(Recommendation(
                type='sample_size',
                priority='medium',
                title='Consider Adding More Samples',
                description=f'Adding {additional_needed} more samples could improve accuracy by ~10%.',
                impact_estimate='+5-10% accuracy'
            ))
        
        # ========================================
        # Accuracy Recommendations
        # ========================================
        if best.accuracy < 70:
            recommendations.append(Recommendation(
                type='accuracy',
                priority='high',
                title='Accuracy Below Threshold',
                description='Best configuration achieved only {:.1f}% accuracy. Consider: '
                           '1) Adding more diverse samples, '
                           '2) Reviewing truth keys for consistency, '
                           '3) Uploading more context documents.'.format(best.accuracy),
                impact_estimate='Variable'
            ))
        
        # ========================================
        # False Positive/Negative Analysis
        # ========================================
        if best.false_positive_rate > 0.15:
            recommendations.append(Recommendation(
                type='false_positives',
                priority='medium',
                title='High False Positive Rate',
                description=f'False positive rate is {best.false_positive_rate:.1%}. '
                           f'The "{best.strategy}" strategy may be too lenient. '
                           f'Consider using a more conservative variation.',
                impact_estimate='-5-10% false positives'
            ))
        
        if best.false_negative_rate > 0.15:
            recommendations.append(Recommendation(
                type='false_negatives',
                priority='medium',
                title='High False Negative Rate',
                description=f'False negative rate is {best.false_negative_rate:.1%}. '
                           f'The system may be too strict. Consider adding more '
                           f'context documents explaining acceptable variations.',
                impact_estimate='-5-10% false negatives'
            ))
        
        # ========================================
        # Variation Comparison Insights
        # ========================================
        strategies_by_accuracy = sorted(variation_results, key=lambda x: x.accuracy, reverse=True)
        top_3_strategies = [v.strategy for v in strategies_by_accuracy[:3]]
        
        recommendations.append(Recommendation(
            type='strategy_insight',
            priority='info',
            title='Top Performing Strategies',
            description=f'Best strategies: {", ".join(top_3_strategies)}. '
                       f'Consider running a "thorough" optimization to test more variations.',
            impact_estimate='N/A'
        ))
        
        # ========================================
        # Context Document Recommendations
        # ========================================
        if not domain_knowledge.has_standards():
            recommendations.append(Recommendation(
                type='context_docs',
                priority='medium',
                title='Add Standards Documents',
                description='No compliance standards detected in context documents. '
                           'Upload official standards (CJIS, NIST, etc.) for better domain awareness.',
                impact_estimate='+10-15% accuracy'
            ))
        
        return recommendations
```

---

## Database Schema

### Existing Tables Used

| Table | Purpose |
|-------|---------|
| `ai_providers` | LLM provider configuration |
| `ai_models` | Available models for prompting |
| `kb_docs` | Context documents (via module-kb) |
| `kb_chunks` | Document chunks for RAG |
| `eval_opt_doc_groups` | Sample document groups |
| `eval_opt_truth_keys` | Manual evaluations (truth keys) |
| `eval_opt_runs` | Optimization run metadata |
| `eval_opt_run_results` | Individual evaluation results |
| `eval_opt_response_structures` | Response format definitions |

### New Fields for eval_opt_runs

Already added in Phase 4A schema refactoring:

```sql
-- eval_opt_runs already has these fields:
context_doc_ids UUID[],              -- KB doc IDs for RAG context
response_structure_id UUID,          -- Reference to response structure
generated_prompts JSONB,             -- Store generated prompt variations
```

---

## API Endpoints

### POST /api/workspaces/{wsId}/runs

**Start an optimization run.**

```typescript
interface StartRunRequest {
  name: string;
  thoroughness: 'fast' | 'balanced' | 'thorough';
  // LLM configuration inherited from workspace or explicit
  metaPromptModelId?: string;  // LLM for prompt generation
  evalModelId?: string;        // LLM for running evaluations
}

interface StartRunResponse {
  id: string;
  status: 'pending';
  message: string;
}
```

### GET /api/workspaces/{wsId}/runs/{runId}

**Get optimization run status and results.**

```typescript
interface RunResponse {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;  // 0-100
  progressMessage?: string;
  
  // Results (when completed)
  bestVariation?: string;
  overallAccuracy?: number;
  recommendations?: Recommendation[];
  variationResults?: VariationResult[];
}
```

### GET /api/workspaces/{wsId}/runs/{runId}/results

**Get detailed results for an optimization run.**

```typescript
interface DetailedResultsResponse {
  runId: string;
  variations: Array<{
    name: string;
    strategy: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
    perCriteriaResults: Array<{
      criteriaId: string;
      accuracy: number;
      errors: Array<{
        docGroupId: string;
        expected: string;
        actual: string;
        explanation: string;
      }>;
    }>;
  }>;
  recommendations: Recommendation[];
}
```

---

## LLM Configuration

### System-Level Defaults

Stored in new table `eval_opt_cfg_sys`:

```sql
CREATE TABLE eval_opt_cfg_sys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Meta-prompting LLM (for generating prompts)
    meta_prompt_provider_id UUID REFERENCES ai_providers(id),
    meta_prompt_model_id UUID REFERENCES ai_models(id),
    
    -- Evaluation LLM (for running evaluations)
    eval_provider_id UUID REFERENCES ai_providers(id),
    eval_model_id UUID REFERENCES ai_models(id),
    
    -- Default parameters
    meta_prompt_temperature DECIMAL(3,2) DEFAULT 0.7,
    meta_prompt_max_tokens INTEGER DEFAULT 4000,
    eval_temperature DECIMAL(3,2) DEFAULT 0.2,
    eval_max_tokens INTEGER DEFAULT 2000,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Workspace-Level Overrides

Stored in `eval_opt_response_structures` or new workspace config:

```sql
-- Option: Add to existing response_structures
ALTER TABLE eval_opt_response_structures
ADD COLUMN eval_provider_id UUID REFERENCES ai_providers(id),
ADD COLUMN eval_model_id UUID REFERENCES ai_models(id);
```

### Configuration Resolution

```python
def get_llm_config(ws_id: str) -> LLMConfig:
    """
    Get LLM configuration with inheritance.
    
    Priority:
    1. Workspace-level override (if set)
    2. System-level default
    3. Fallback defaults
    """
    # Try workspace config
    ws_config = get_workspace_config(ws_id)
    
    # Get system defaults
    sys_config = get_sys_config()
    
    return LLMConfig(
        meta_prompt_provider_id=ws_config.meta_prompt_provider_id or sys_config.meta_prompt_provider_id,
        meta_prompt_model_id=ws_config.meta_prompt_model_id or sys_config.meta_prompt_model_id,
        eval_provider_id=ws_config.eval_provider_id or sys_config.eval_provider_id,
        eval_model_id=ws_config.eval_model_id or sys_config.eval_model_id,
        # ... other params
    )
```

---

## Implementation Plan

### Phase 4B: RAG Pipeline + Meta-Prompter (Week 1)

**Tasks:**
1. Create `opt-orchestrator` Lambda structure
2. Implement RAG pipeline using module-kb
3. Implement LLM meta-prompter
4. Create system config table for LLM defaults
5. Unit tests for RAG extraction

**Files to Create:**
```
templates/_modules-functional/module-eval-optimizer/
├── backend/
│   ├── lambdas/
│   │   └── opt-orchestrator/
│   │       ├── lambda_function.py
│   │       ├── requirements.txt
│   │       ├── rag_pipeline.py
│   │       ├── meta_prompter.py
│   │       ├── variation_generator.py
│   │       └── recommendation_engine.py
│   └── build.sh
```

### Phase 4C: Orchestrator + Results (Week 2)

**Tasks:**
1. Implement optimization orchestrator main loop
2. Implement variation generator
3. Implement comparison logic (AI vs truth keys)
4. Progress tracking and status updates
5. Integration tests with real documents

### Phase 4D: Recommendations + Testing (Week 3)

**Tasks:**
1. Implement recommendation engine
2. End-to-end testing with real domain docs
3. Performance optimization (parallel evaluation)
4. Documentation and API README

---

## Success Criteria

### Functional
- [ ] RAG extracts meaningful domain knowledge from context docs
- [ ] Meta-prompter generates domain-aware evaluation prompts
- [ ] System tests 5-12 variations per run (based on thoroughness)
- [ ] Results accurately compared to truth keys
- [ ] Best configuration identified automatically
- [ ] Recommendations generated based on results

### Performance
- [ ] Optimization run completes in < 30 minutes for 10 samples
- [ ] Progress updates every 30 seconds during run
- [ ] Graceful handling of LLM timeouts/errors

### Quality
- [ ] Accuracy improvement measurable vs generic prompts
- [ ] Recommendations actionable and specific
- [ ] Error messages helpful for debugging

---

## Open Questions

### Resolved

1. **Q: Which LLM for meta-prompting?**  
   **A:** Configurable via system/workspace settings. Uses existing `ai_providers` and `ai_models` tables.

2. **Q: Vector database for RAG?**  
   **A:** None needed. Uses existing module-kb with `kb_chunks` table.

### Pending

1. **Q: Parallel evaluation of variations?**  
   Consider: Run variations in parallel to reduce total time. Need to assess API rate limits.

2. **Q: Caching domain knowledge?**  
   Consider: Cache RAG extraction results to avoid re-processing same context docs.

---

## References

- **Context:** `memory-bank/context-eval-optimization.md`
- **Sprint Plan:** `docs/plans/plan_eval-optimization-s2.md`
- **Phase 4 Redesign:** `docs/specifications/spec_eval-optimizer-phase4-redesign.md`
- **Module-AI Pattern:** `templates/_modules-core/module-ai/backend/lambdas/provider/lambda_function.py`
- **Module-Eval Pattern:** `templates/_modules-functional/module-eval/backend/lambdas/eval-processor/lambda_function.py`
- **ADR-021:** `docs/arch decisions/ADR-021-EVAL-OPTIMIZER-DEPLOYMENT.md`