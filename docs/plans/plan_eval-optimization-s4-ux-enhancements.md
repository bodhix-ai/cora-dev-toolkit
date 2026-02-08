# Plan: Eval Optimization S4 - Truth Set Wizard UX Enhancements

**Status:** 📋 To Do  
**Branch:** `feature/eval-optimization-s4`  
**Created:** February 7, 2026  
**Priority:** HIGH (blocks effective truth set creation)  

---

## User Feedback (Feb 7, 2026 6:55 PM)

After initial testing, the following UX issues were identified in the Truth Set creation wizard:

1. ❌ Document section hardcoded with "Loading document..."
2. ❌ No citation feature (highlight text → add to citations)
3. ❌ No focus mode (left nav takes up space, small working area)
4. ❌ Scoring section doesn't expand vertically with content
5. ❌ Next/Previous buttons far from criterion text (should be adjacent)

---

## Issue 1: Document Viewer Not Loading

**Problem:** Document section shows "Loading document..." placeholder instead of actual content.

**Root Cause:** Document content not being fetched or passed to DocumentViewer component.

**Fix:**

```typescript
// In page.tsx
const [selectedDocument, setSelectedDocument] = useState<KBDocument | null>(null);
const [documentContent, setDocumentContent] = useState<string>('');

// Fetch document when selected
useEffect(() => {
  if (selectedDocId) {
    fetchDocumentContent(selectedDocId).then(content => {
      setDocumentContent(content.text || '');
      setSelectedDocument(content);
    });
  }
}, [selectedDocId]);

// Pass to DocumentViewer
<DocumentViewer 
  content={documentContent} 
  documentName={selectedDocument?.filename}
  onTextSelect={handleTextSelect}
/>
```

**Priority:** 🔴 CRITICAL - Blocks all testing

---

## Issue 2: Text Highlighting & Citation Feature

**Problem:** Users can't easily capture citations while reading the document.

**Desired UX:**
1. User highlights text in document viewer
2. Click "Add Citation" button (or keyboard shortcut)
3. Highlighted text added to citations list
4. Visual indicator shows text is cited

**Implementation:**

### DocumentViewer Enhancement

```typescript
export function DocumentViewer({ 
  content, 
  documentName,
  onCitationAdd 
}: DocumentViewerProps) {
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
      setSelectionRange(selection.getRangeAt(0));
    }
  };

  const handleAddCitation = () => {
    if (selectedText) {
      onCitationAdd({
        text: selectedText,
        page: getCurrentPage(), // If PDF
        timestamp: new Date().toISOString()
      });
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
      setSelectedText('');
      
      toast.success('Citation added');
    }
  };

  return (
    <div className="document-viewer">
      <div 
        className="document-content"
        onMouseUp={handleTextSelection}
        style={{ userSelect: 'text' }}
      >
        {content}
      </div>
      
      {selectedText && (
        <div className="citation-tooltip">
          <Button 
            size="sm" 
            onClick={handleAddCitation}
            className="flex items-center gap-2"
          >
            <PlusIcon />
            Add Citation ({selectedText.length} chars)
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Parent Component Integration

```typescript
// In TruthSetPage.tsx
const [citations, setCitations] = useState<Citation[]>([]);

const handleCitationAdd = (citation: Citation) => {
  setCitations(prev => [...prev, citation]);
};

// Pass to form
<CriteriaEvaluationForm
  citations={citations}
  onCitationRemove={handleCitationRemove}
/>
```

**Priority:** 🟡 HIGH - Important for analyst workflow

---

## Issue 3: Focus Mode for Maximum Working Space

**Problem:** Left navigation reduces working space. Document viewer + scoring section need maximum width.

**Solution:** Focus mode that hides left nav and expands content to full width.

**Implementation:**

### 1. Add Focus Mode Toggle

```typescript
// In TruthSetPage.tsx
const [focusMode, setFocusMode] = useState(false);

return (
  <div className={cn(
    "truth-set-page",
    focusMode && "focus-mode" // Applies full-width styles
  )}>
    <div className="header">
      <h1>Create Truth Set</h1>
      
      <Button 
        onClick={() => setFocusMode(!focusMode)}
        variant="ghost"
        className="flex items-center gap-2"
      >
        {focusMode ? (
          <>
            <CompressIcon />
            Exit Focus Mode
          </>
        ) : (
          <>
            <ExpandIcon />
            Focus Mode
          </>
        )}
      </Button>
    </div>
    
    {/* Rest of content */}
  </div>
);
```

### 2. CSS for Focus Mode

```css
.truth-set-page.focus-mode {
  /* Hide left nav */
  & ~ .sidebar {
    display: none;
  }
  
  /* Expand content to full width */
  max-width: 100vw;
  margin-left: 0;
  padding: 2rem;
  
  /* Split screen gets more space */
  .split-view {
    grid-template-columns: 1fr 1fr; /* 50/50 split */
  }
}

/* Default (non-focus) mode */
.truth-set-page:not(.focus-mode) {
  .split-view {
    grid-template-columns: 40% 60%; /* Document smaller */
  }
}
```

### 3. Keyboard Shortcut

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setFocusMode(prev => !prev);
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

**Priority:** 🟡 HIGH - Improves productivity significantly

---

## Issue 4: Vertical Expansion of Scoring Section

**Problem:** Scoring section doesn't expand vertically, making it hard to see all fields.

**Solution:** Allow scoring panel to scroll independently or expand with content.

**Implementation:**

### Option A: Independent Scroll

```css
.split-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: calc(100vh - 200px); /* Full height minus header */
  gap: 1rem;
}

.document-panel {
  overflow-y: auto;
  height: 100%;
}

.scoring-panel {
  overflow-y: auto;
  height: 100%;
  
  /* Sticky criterion header */
  .criterion-header {
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .criterion-form {
    padding: 1rem;
    
    /* All fields expand naturally */
    .field-group {
      margin-bottom: 1.5rem;
    }
  }
}
```

### Option B: Dynamic Height with Min/Max

```css
.scoring-panel {
  min-height: 400px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  
  /* Fields expand with content */
  textarea {
    min-height: 100px;
    resize: vertical; /* Allow manual resize */
  }
  
  .list-field {
    /* Expands with list items */
    min-height: auto;
  }
}
```

**Priority:** 🟢 MEDIUM - UX improvement

---

## Issue 5: Navigation Button Placement

**Problem:** Next/Previous buttons are at bottom of page, far from criterion text. Not intuitive.

**Solution:** Place navigation adjacent to criterion text.

### Option A: Buttons Above Criterion (Recommended)

```tsx
<div className="scoring-panel">
  {/* Navigation bar */}
  <div className="criterion-navigation">
    <Button
      onClick={handlePrevious}
      disabled={currentIndex === 0}
      variant="ghost"
      size="sm"
    >
      ← Previous
    </Button>
    
    <div className="criterion-indicator">
      Criterion {currentIndex + 1} of {totalCriteria}
    </div>
    
    <Button
      onClick={handleNext}
      disabled={currentIndex === totalCriteria - 1}
      variant="ghost"
      size="sm"
    >
      Next →
    </Button>
  </div>
  
  {/* Criterion content */}
  <div className="criterion-content">
    <h3>{currentCriterion.name}</h3>
    <p>{currentCriterion.description}</p>
  </div>
  
  {/* Evaluation form */}
  <CriteriaEvaluationForm ... />
</div>
```

### Option B: Icon Arrows Adjacent to Criterion Text (More Intuitive)

```tsx
<div className="criterion-header">
  <div className="flex items-center gap-4">
    {/* Left arrow */}
    <IconButton
      onClick={handlePrevious}
      disabled={currentIndex === 0}
      aria-label="Previous criterion"
    >
      <ChevronLeftIcon className="w-6 h-6" />
    </IconButton>
    
    {/* Criterion text */}
    <div className="criterion-info flex-1">
      <div className="text-sm text-gray-500">
        Criterion {currentIndex + 1} of {totalCriteria}
      </div>
      <h3 className="text-lg font-semibold">
        {currentCriterion.name}
      </h3>
      <p className="text-sm text-gray-600">
        {currentCriterion.description}
      </p>
    </div>
    
    {/* Right arrow */}
    <IconButton
      onClick={handleNext}
      disabled={currentIndex === totalCriteria - 1}
      aria-label="Next criterion"
    >
      <ChevronRightIcon className="w-6 h-6" />
    </IconButton>
  </div>
</div>
```

**Visual Mockup:**
```
┌────────────────────────────────────────────────────────┐
│  [←]  Criterion 3 of 12               [→]              │
│       Access Control Review Process                    │
│       Verify quarterly access review documentation     │
└────────────────────────────────────────────────────────┘
│                                                         │
│  [Score field]                                         │
│  [Justification textarea]                              │
│  [Findings textarea]                                   │
│  ...                                                   │
```

**Priority:** 🟢 MEDIUM - UX improvement

---

## Implementation Order

### Sprint 4 (Current) - Critical Fixes
1. ✅ **Issue 1: Document Loading** - Blocks all testing
2. ✅ **Issue 3: Focus Mode** - Major productivity improvement

### Sprint 4+ (Follow-up) - Enhancements
3. ⏭️ **Issue 5: Navigation Placement** - Quick UX win
4. ⏭️ **Issue 4: Vertical Expansion** - Layout improvement
5. ⏭️ **Issue 2: Citation Feature** - Nice-to-have (can cite manually for now)

---

## Success Criteria

- [ ] Document content loads and displays correctly
- [ ] Focus mode hides left nav and expands content to full width
- [ ] Users can highlight text and add citations easily
- [ ] Scoring panel scrolls independently and shows all fields
- [ ] Next/Previous buttons are adjacent to criterion text (intuitive navigation)

---

## Testing Checklist

- [ ] Document viewer loads actual content (not "Loading...")
- [ ] Text selection works in document viewer
- [ ] Citations can be added and removed
- [ ] Focus mode toggles correctly (Ctrl/Cmd+F)
- [ ] Scoring panel scrolls independently
- [ ] All form fields visible without excessive scrolling
- [ ] Next/Previous navigation works intuitively
- [ ] Auto-save works on field blur
- [ ] Progress indicator shows completion status

---

**Document Status:** Ready for implementation  
**Next Session:** Implement Issue 1 (document loading) and Issue 3 (focus mode)