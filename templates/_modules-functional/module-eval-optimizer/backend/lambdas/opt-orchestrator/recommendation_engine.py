"""
Recommendation Engine for Eval Optimization

Analyzes optimization results and generates actionable recommendations
for improving evaluation accuracy.
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


@dataclass
class Recommendation:
    """A single actionable recommendation."""
    type: str  # 'sample_size', 'accuracy', 'false_positives', 'false_negatives', 'strategy_insight', 'context_docs'
    priority: str  # 'high', 'medium', 'low', 'info'
    title: str
    description: str
    impact_estimate: str = ""
    action_items: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'type': self.type,
            'priority': self.priority,
            'title': self.title,
            'description': self.description,
            'impactEstimate': self.impact_estimate,
            'actionItems': self.action_items
        }


class RecommendationEngine:
    """
    Generate actionable recommendations from optimization results.
    
    Analyzes variation results, sample sizes, error patterns, and
    domain knowledge to provide specific suggestions for improvement.
    """
    
    # Thresholds for recommendations
    MIN_SAMPLES_FOR_RELIABILITY = 10
    MIN_SAMPLES_FOR_HIGH_CONFIDENCE = 25
    ACCURACY_THRESHOLD_HIGH = 85
    ACCURACY_THRESHOLD_ACCEPTABLE = 70
    FALSE_POSITIVE_THRESHOLD = 0.15
    FALSE_NEGATIVE_THRESHOLD = 0.15
    
    def generate(
        self,
        variation_results: List[Dict[str, Any]],
        doc_groups: List[Dict[str, Any]],
        domain_knowledge  # DomainKnowledge
    ) -> List[Recommendation]:
        """
        Generate recommendations based on optimization results.
        
        Args:
            variation_results: List of results per variation (accuracy, TP/FP/TN/FN)
            doc_groups: List of evaluated document groups
            domain_knowledge: Extracted domain knowledge from RAG pipeline
            
        Returns:
            List of Recommendation objects sorted by priority
        """
        recommendations = []
        
        if not variation_results:
            recommendations.append(Recommendation(
                type='error',
                priority='high',
                title='No Results Available',
                description='Optimization run did not produce any results. Please check the run logs for errors.',
                impact_estimate='N/A'
            ))
            return recommendations
        
        # Find best variation
        best = max(variation_results, key=lambda x: x.get('accuracy', 0))
        best_accuracy = best.get('accuracy', 0)
        sample_count = len(doc_groups)
        
        # ========================================
        # Sample Size Recommendations
        # ========================================
        recommendations.extend(self._analyze_sample_size(sample_count, best_accuracy))
        
        # ========================================
        # Accuracy Recommendations
        # ========================================
        recommendations.extend(self._analyze_accuracy(best, variation_results))
        
        # ========================================
        # False Positive/Negative Analysis
        # ========================================
        recommendations.extend(self._analyze_error_rates(best))
        
        # ========================================
        # Variation Comparison Insights
        # ========================================
        recommendations.extend(self._analyze_variations(variation_results))
        
        # ========================================
        # Context Document Recommendations
        # ========================================
        recommendations.extend(self._analyze_domain_knowledge(domain_knowledge, best_accuracy))
        
        # Sort by priority
        priority_order = {'high': 0, 'medium': 1, 'low': 2, 'info': 3}
        recommendations.sort(key=lambda r: priority_order.get(r.priority, 4))
        
        return recommendations
    
    def _analyze_sample_size(self, sample_count: int, best_accuracy: float) -> List[Recommendation]:
        """Analyze sample size and recommend improvements."""
        recommendations = []
        
        if sample_count < 5:
            recommendations.append(Recommendation(
                type='sample_size',
                priority='high',
                title='Critical: Insufficient Sample Size',
                description=f'You have only {sample_count} sample(s). Results are unreliable. '
                           f'Add at least {self.MIN_SAMPLES_FOR_RELIABILITY - sample_count} more samples for meaningful optimization.',
                impact_estimate='+20-30% confidence',
                action_items=[
                    f'Add {self.MIN_SAMPLES_FOR_RELIABILITY - sample_count} more sample documents',
                    'Include diverse document types from your domain',
                    'Manually evaluate each new sample before re-running optimization'
                ]
            ))
        elif sample_count < self.MIN_SAMPLES_FOR_RELIABILITY:
            additional_needed = self.MIN_SAMPLES_FOR_RELIABILITY - sample_count
            recommendations.append(Recommendation(
                type='sample_size',
                priority='medium',
                title='Add More Sample Documents',
                description=f'You have {sample_count} samples. Adding {additional_needed} more would significantly improve reliability.',
                impact_estimate='+10-15% confidence',
                action_items=[
                    f'Add {additional_needed} more sample documents',
                    'Focus on edge cases and variations in your document types'
                ]
            ))
        elif sample_count < self.MIN_SAMPLES_FOR_HIGH_CONFIDENCE:
            additional_needed = self.MIN_SAMPLES_FOR_HIGH_CONFIDENCE - sample_count
            recommendations.append(Recommendation(
                type='sample_size',
                priority='low',
                title='Consider Adding More Samples for High Confidence',
                description=f'You have {sample_count} samples, which is good. Adding {additional_needed} more '
                           f'would give high confidence in results.',
                impact_estimate='+5% confidence',
                action_items=[
                    f'Consider adding {additional_needed} more samples over time'
                ]
            ))
        
        return recommendations
    
    def _analyze_accuracy(
        self,
        best: Dict[str, Any],
        variation_results: List[Dict[str, Any]]
    ) -> List[Recommendation]:
        """Analyze accuracy and recommend improvements."""
        recommendations = []
        best_accuracy = best.get('accuracy', 0)
        
        if best_accuracy < self.ACCURACY_THRESHOLD_ACCEPTABLE:
            recommendations.append(Recommendation(
                type='accuracy',
                priority='high',
                title='Accuracy Below Acceptable Threshold',
                description=f'Best configuration achieved only {best_accuracy:.1f}% accuracy, '
                           f'below the {self.ACCURACY_THRESHOLD_ACCEPTABLE}% acceptable threshold.',
                impact_estimate='Variable (depends on actions taken)',
                action_items=[
                    'Review truth keys for consistency (are your manual evaluations correct?)',
                    'Add more diverse sample documents',
                    'Upload additional context documents with relevant standards',
                    'Consider if criteria are too subjective for AI evaluation'
                ]
            ))
        elif best_accuracy < self.ACCURACY_THRESHOLD_HIGH:
            gap = self.ACCURACY_THRESHOLD_HIGH - best_accuracy
            recommendations.append(Recommendation(
                type='accuracy',
                priority='medium',
                title='Accuracy Could Be Improved',
                description=f'Best configuration achieved {best_accuracy:.1f}% accuracy. '
                           f'Consider improvements to reach {self.ACCURACY_THRESHOLD_HIGH}% target.',
                impact_estimate=f'+{gap:.0f}% potential improvement',
                action_items=[
                    'Add more sample documents for problem criteria',
                    'Upload context documents explaining edge cases',
                    'Run "thorough" optimization to test more variations'
                ]
            ))
        else:
            recommendations.append(Recommendation(
                type='accuracy',
                priority='info',
                title='Good Accuracy Achieved',
                description=f'Best configuration achieved {best_accuracy:.1f}% accuracy, '
                           f'meeting the high accuracy threshold.',
                impact_estimate='N/A'
            ))
        
        return recommendations
    
    def _analyze_error_rates(self, best: Dict[str, Any]) -> List[Recommendation]:
        """Analyze false positive/negative rates."""
        recommendations = []
        
        tp = best.get('true_positives', 0)
        fp = best.get('false_positives', 0)
        tn = best.get('true_negatives', 0)
        fn = best.get('false_negatives', 0)
        
        total = tp + fp + tn + fn
        if total == 0:
            return recommendations
        
        fp_rate = fp / total if total > 0 else 0
        fn_rate = fn / total if total > 0 else 0
        
        if fp_rate > self.FALSE_POSITIVE_THRESHOLD:
            recommendations.append(Recommendation(
                type='false_positives',
                priority='medium',
                title='High False Positive Rate',
                description=f'False positive rate is {fp_rate:.1%}, above the {self.FALSE_POSITIVE_THRESHOLD:.0%} threshold. '
                           f'The system may be marking items as compliant when they should not be.',
                impact_estimate=f'-{(fp_rate - self.FALSE_POSITIVE_THRESHOLD) * 100:.0f}% false positives',
                action_items=[
                    'Use a more conservative prompt variation',
                    'Add context documents with stricter interpretation guidance',
                    'Review truth keys for criteria that are often false positives'
                ]
            ))
        
        if fn_rate > self.FALSE_NEGATIVE_THRESHOLD:
            recommendations.append(Recommendation(
                type='false_negatives',
                priority='medium',
                title='High False Negative Rate',
                description=f'False negative rate is {fn_rate:.1%}, above the {self.FALSE_NEGATIVE_THRESHOLD:.0%} threshold. '
                           f'The system may be marking items as non-compliant when they should be compliant.',
                impact_estimate=f'-{(fn_rate - self.FALSE_NEGATIVE_THRESHOLD) * 100:.0f}% false negatives',
                action_items=[
                    'Use a more lenient prompt variation',
                    'Add context documents explaining acceptable variations',
                    'Review truth keys for criteria that are often false negatives'
                ]
            ))
        
        return recommendations
    
    def _analyze_variations(self, variation_results: List[Dict[str, Any]]) -> List[Recommendation]:
        """Analyze variation performance and provide insights."""
        recommendations = []
        
        if len(variation_results) < 2:
            return recommendations
        
        # Sort by accuracy
        sorted_results = sorted(variation_results, key=lambda x: x.get('accuracy', 0), reverse=True)
        
        # Get top 3 strategies
        top_strategies = [r.get('strategy', 'unknown') for r in sorted_results[:3]]
        bottom_strategies = [r.get('strategy', 'unknown') for r in sorted_results[-2:]]
        
        # Calculate accuracy spread
        best_accuracy = sorted_results[0].get('accuracy', 0)
        worst_accuracy = sorted_results[-1].get('accuracy', 0)
        spread = best_accuracy - worst_accuracy
        
        if spread > 20:
            recommendations.append(Recommendation(
                type='strategy_insight',
                priority='info',
                title='Significant Variation in Strategy Performance',
                description=f'Strategy performance varies by {spread:.1f}% (best: {best_accuracy:.1f}%, worst: {worst_accuracy:.1f}%). '
                           f'Top strategies: {", ".join(top_strategies)}. '
                           f'Underperforming: {", ".join(bottom_strategies)}.',
                impact_estimate='N/A',
                action_items=[
                    f'Consider focusing on {top_strategies[0]} strategy',
                    'Run "thorough" optimization to explore more variations'
                ]
            ))
        else:
            recommendations.append(Recommendation(
                type='strategy_insight',
                priority='info',
                title='Consistent Strategy Performance',
                description=f'All strategies perform within {spread:.1f}% of each other. '
                           f'Top performers: {", ".join(top_strategies)}.',
                impact_estimate='N/A'
            ))
        
        return recommendations
    
    def _analyze_domain_knowledge(self, domain_knowledge, best_accuracy: float) -> List[Recommendation]:
        """Analyze domain knowledge and recommend context document improvements."""
        recommendations = []
        
        if domain_knowledge is None:
            recommendations.append(Recommendation(
                type='context_docs',
                priority='medium' if best_accuracy < self.ACCURACY_THRESHOLD_HIGH else 'low',
                title='No Context Documents Provided',
                description='No context documents were provided. Adding domain standards and guides '
                           'can significantly improve evaluation accuracy.',
                impact_estimate='+10-20% accuracy',
                action_items=[
                    'Upload compliance standards (CJIS, NIST, HIPAA, etc.)',
                    'Add internal policy documents',
                    'Include example evaluations or guides'
                ]
            ))
            return recommendations
        
        # Check for standards
        if not domain_knowledge.has_standards():
            recommendations.append(Recommendation(
                type='context_docs',
                priority='medium',
                title='No Standards Detected in Context Documents',
                description='No compliance standards were detected in the uploaded context documents. '
                           'Adding official standards documents can improve domain-aware prompt generation.',
                impact_estimate='+10-15% accuracy',
                action_items=[
                    'Upload official standards documents (CJIS, NIST, etc.)',
                    'Include regulatory guidance documents',
                    'Add audit guidelines or checklists'
                ]
            ))
        
        # Check for requirements
        if len(domain_knowledge.requirements) < 5:
            recommendations.append(Recommendation(
                type='context_docs',
                priority='low',
                title='Limited Requirements Extracted',
                description=f'Only {len(domain_knowledge.requirements)} requirements were extracted from context documents. '
                           f'Consider adding more detailed requirements documentation.',
                impact_estimate='+5-10% accuracy',
                action_items=[
                    'Add detailed requirements documents',
                    'Include policy documents with specific mandates'
                ]
            ))
        
        return recommendations