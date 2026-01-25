# Citations Review & Modal - Plan

**Status**: 🟡 IN PROGRESS
**Branch**: `feature/citations-review`
**Priority**: 🔴 HIGH
**Created**: January 23, 2026
**Owner**: Engineering Team

---

## Overview

Implement a comprehensive citation review system for the Evaluation module. Users need to view detailed citations for each criteria result without navigating away from the results list. This improves trust in the AI evaluation by surfacing the evidence.

## Goals

1.  **Citation Modal**: Implement a modal that opens when clicking the citation paperclip/button.
2.  **Contextual Display**: Show the citation text, source document name, and page/paragraph number.
3.  **Multiple Citations**: Handle results with multiple citations elegantly.
4.  **Source Linking**: Provide a link to open the source document (if applicable/available).

## Implementation Steps

### Phase 1: Citation Modal Component
- [ ] Create `CitationModal` component in `frontend/components`.
- [ ] Design layout for list of citations.
- [ ] Display fields:
    - Text/Quote
    - Source Document (name/link)
    - Location (page/paragraph)
    - Relevance/Score (if available)

### Phase 2: Integration with EvalQAList
- [ ] Update `EvalQAList` to pass `onViewCitations` callback with citation data.
- [ ] Ensure paperclip button triggers the callback.

### Phase 3: Page Integration
- [ ] Update `EvalDetailPage` to manage `citationModalOpen` state and `selectedCitations` data.
- [ ] Render `CitationModal` when state is open.

### Phase 4: Testing & Verification
- [ ] Verify modal opens with correct data.
- [ ] Test multiple citations.
- [ ] Test empty/missing citation fields.

## Technical Considerations

- **Data Structure**: Ensure `Citation` type matches backend response.
- **Accessibility**: Modal should be accessible (focus management, keyboard support).
- **Responsive**: Modal should work on mobile.

## Success Criteria

- [ ] Clicking paperclip opens modal.
- [ ] Modal lists all citations for that result.
- [ ] Citation text is readable.
- [ ] Source document name is displayed.
