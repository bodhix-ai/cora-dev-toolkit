'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createApiClient } from '@/lib/api-client';

/**
 * New Optimization Run Page
 * 
 * Phase 4 Redesign: Simplified UI with thoroughness selector
 * The system automatically generates domain-aware prompts via RAG + LLM meta-prompting
 * 
 * NO manual prompt editing - the "secret sauce" is automatic prompt generation
 */

type Thoroughness = 'fast' | 'balanced' | 'thorough';

interface ThoroughnessOption {
  value: Thoroughness;
  label: string;
  variations: number;
  duration: string;
  description: string;
}

const THOROUGHNESS_OPTIONS: ThoroughnessOption[] = [
  {
    value: 'fast',
    label: 'Fast',
    variations: 5,
    duration: '~5 min',
    description: 'Quick exploration with 5 prompt variations. Best for initial testing.',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    variations: 7,
    duration: '~7 min',
    description: 'Recommended. Tests 7 variations covering different prompt strategies.',
  },
  {
    value: 'thorough',
    label: 'Thorough',
    variations: 12,
    duration: '~15 min',
    description: 'Comprehensive exploration with 12 variations. Best for production optimization.',
  },
];

export default function NewOptimizationRunPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const wsId = params?.wsId as string;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [thoroughness, setThoroughness] = useState<Thoroughness>('balanced');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.accessToken) return;
    if (!name.trim()) {
      setError('Run name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const client = createApiClient(session.accessToken);
      const response = await client.post(`/eval-opt/workspaces/${wsId}/runs`, {
        name: name.trim(),
        description: description.trim(),
        thoroughness,
      });

      // Navigate to runs list or run detail
      router.push(`/ws/${wsId}/runs/${response.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start optimization run');
      console.error('Error starting run:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/ws/${wsId}`);
  };

  const selectedOption = THOROUGHNESS_OPTIONS.find((opt) => opt.value === thoroughness);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Start Optimization Run</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        The system will automatically generate and test domain-aware prompts using RAG and LLM meta-prompting.
      </p>

      {/* Info Box */}
      <div
        style={{
          padding: '1.5rem',
          backgroundColor: '#d1ecf1',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid #bee5eb',
        }}
      >
        <h4 style={{ marginTop: 0, color: '#0c5460' }}>How Optimization Works</h4>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#0c5460' }}>
          <li>System loads your context documents (domain standards, guides)</li>
          <li>RAG extracts key concepts, terminology, and requirements</li>
          <li>LLM generates domain-aware prompt variations automatically</li>
          <li>System tests each variation against your truth keys</li>
          <li>Best configuration is identified with accuracy metrics</li>
        </ol>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Run Name */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Run Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Initial optimization, Refinement run 2"
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes about this optimization run..."
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Thoroughness Selector */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.75rem' }}>
            Optimization Thoroughness
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {THOROUGHNESS_OPTIONS.map((option) => (
              <div
                key={option.value}
                onClick={() => setThoroughness(option.value)}
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: thoroughness === option.value ? '2px solid #007bff' : '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: thoroughness === option.value ? '#f0f7ff' : 'white',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong>{option.label}</strong>
                  <span style={{ fontSize: '0.875rem', color: '#666' }}>{option.duration}</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#007bff', marginBottom: '0.5rem' }}>
                  {option.variations} variations
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>{option.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              marginBottom: '1.5rem',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Summary */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            marginBottom: '1.5rem',
          }}
        >
          <strong>Summary:</strong> The system will generate {selectedOption?.variations} prompt variations
          and test each against your truth keys. Estimated duration: {selectedOption?.duration}.
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: submitting ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
            }}
          >
            {submitting ? 'Starting...' : 'Start Optimization'}
          </button>
        </div>
      </form>
    </div>
  );
}