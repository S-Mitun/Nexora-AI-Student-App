-- ==============================================================================
-- NEXORA MIGRATION 20260918020000
-- Stage 05: Learning Module & Curriculum Engine
-- 5-Tier Hierarchy: Subject -> Topic -> Concept -> Learning Module -> Lesson
-- ==============================================================================

-- 1. Enhance subjects table
ALTER TABLE public.subjects
    ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Computer Science & Engineering',
    ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(50) DEFAULT 'all-levels',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Enhance topics table
ALTER TABLE public.topics
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 3. Enhance concepts table
ALTER TABLE public.concepts
    ADD COLUMN IF NOT EXISTS short_description TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 4. Enhance learning_modules table
-- Drop unique constraint on concept_id to support 1:many (multiple modules per concept)
ALTER TABLE public.learning_modules
    DROP CONSTRAINT IF EXISTS learning_modules_concept_id_key;

ALTER TABLE public.learning_modules
    ADD COLUMN IF NOT EXISTS slug VARCHAR(200),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS learning_objective TEXT,
    ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(50) DEFAULT 'intermediate',
    ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 15,
    ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 5. Create lessons table (Level 5)
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'explanation', -- explanation, example, definition, key_points, visual, exercise, reading
    content TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    estimated_minutes INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_slug ON public.lessons(slug);

-- 6. Row Level Security (RLS) for lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for lessons" ON public.lessons
    FOR SELECT USING (true);

-- 7. Seed Foundation / Starter Curriculum Data
-- Subjects
INSERT INTO public.subjects (id, name, slug, description, icon, category, difficulty_level, order_index, is_active)
VALUES
    ('sub-00000000-0000-0000-0000-000000000001', 'Data Structures & Algorithms', 'data-structures-algorithms', 'Master asymptotic analysis, memory contiguity, tree traversals, and dynamic graph algorithms.', 'Cpu', 'Computer Science & Engineering', 'all-levels', 1, TRUE),
    ('sub-00000000-0000-0000-0000-000000000002', 'Operating Systems', 'operating-systems', 'Processes, CPU scheduling algorithms, virtual memory paging, and concurrency primitives.', 'FolderKanban', 'Computer Science & Engineering', 'intermediate', 2, TRUE),
    ('sub-00000000-0000-0000-0000-000000000003', 'Database Management Systems', 'database-management-systems', 'Relational algebra, ACID transactions, B-Tree indexes, and normal forms.', 'Binary', 'Computer Science & Engineering', 'intermediate', 3, TRUE),
    ('sub-00000000-0000-0000-0000-000000000004', 'Computer Networks', 'computer-networks', 'The OSI stack, TCP congestion control, IP subnetting, and socket architectures.', 'Zap', 'Computer Science & Engineering', 'intermediate', 4, TRUE),
    ('sub-00000000-0000-0000-0000-000000000005', 'Artificial Intelligence & Machine Learning', 'artificial-intelligence-machine-learning', 'Gradient descent, neural network architectures, loss landscapes, and model evaluation.', 'Sparkles', 'Computer Science & Engineering', 'intermediate', 5, TRUE),
    ('sub-00000000-0000-0000-0000-000000000006', 'Physics', 'physics', 'Wave mechanics, kinematics, Doppler shifts, electromagnetism, and orbital dynamics.', 'Zap', 'Natural Sciences', 'all-levels', 6, TRUE)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    difficulty_level = EXCLUDED.difficulty_level,
    order_index = EXCLUDED.order_index;

-- Topics for DSA
INSERT INTO public.topics (id, subject_id, name, slug, description, order_index, is_active)
VALUES
    ('top-00000000-0000-0000-0000-000000000001', 'sub-00000000-0000-0000-0000-000000000001', 'Arrays & Search', 'arrays-search', 'Contiguous memory layout, cache locality, and logarithmic search patterns.', 1, TRUE),
    ('top-00000000-0000-0000-0000-000000000002', 'sub-00000000-0000-0000-0000-000000000001', 'Linked Lists', 'linked-lists', 'Non-contiguous pointer nodes, pointer manipulation, and cycle detection.', 2, TRUE),
    ('top-00000000-0000-0000-0000-000000000003', 'sub-00000000-0000-0000-0000-000000000001', 'Trees & Hierarchies', 'trees-hierarchies', 'Binary trees, balanced search trees, heaps, and recursive traversals.', 3, TRUE),
    ('top-00000000-0000-0000-0000-000000000004', 'sub-00000000-0000-0000-0000-000000000001', 'Graphs & Networks', 'graphs-networks', 'Adjacency structures, topological ordering, shortest paths, and spanning trees.', 4, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Topics for OS
INSERT INTO public.topics (id, subject_id, name, slug, description, order_index, is_active)
VALUES
    ('top-00000000-0000-0000-0000-000000000005', 'sub-00000000-0000-0000-0000-000000000002', 'Processes & Threads', 'processes-threads', 'Address spaces, PCB structures, context switching, and POSIX threads.', 1, TRUE),
    ('top-00000000-0000-0000-0000-000000000006', 'sub-00000000-0000-0000-0000-000000000002', 'CPU Scheduling', 'cpu-scheduling', 'Preemptive vs non-preemptive schedulers, Round Robin, and Multi-Level Feedback Queues.', 2, TRUE),
    ('top-00000000-0000-0000-0000-000000000007', 'sub-00000000-0000-0000-0000-000000000002', 'Memory Management', 'memory-management', 'Paging, TLB caches, page faults, and virtual address translation.', 3, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Topics for DBMS
INSERT INTO public.topics (id, subject_id, name, slug, description, order_index, is_active)
VALUES
    ('top-00000000-0000-0000-0000-000000000008', 'sub-00000000-0000-0000-0000-000000000003', 'Relational Model & SQL', 'relational-model-sql', 'Relational schemas, foreign keys, declarative querying, and joins.', 1, TRUE),
    ('top-00000000-0000-0000-0000-000000000009', 'sub-00000000-0000-0000-0000-000000000003', 'Normalization & Design', 'normalization-design', 'Functional dependencies, 1NF through BCNF, and lossless decomposition.', 2, TRUE),
    ('top-00000000-0000-0000-0000-000000000010', 'sub-00000000-0000-0000-0000-000000000003', 'Transactions & Concurrency', 'transactions-concurrency', 'ACID properties, Write-Ahead Logging, and 2-Phase Locking.', 3, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Concepts for Arrays & Search
INSERT INTO public.concepts (id, topic_id, name, slug, summary, short_description, difficulty, order_index, is_active)
VALUES
    ('con-00000000-0000-0000-0000-000000000001', 'top-00000000-0000-0000-0000-000000000001', 'Binary Search', 'binary-search', 'A divide-and-conquer algorithm that finds the position of a target value within a sorted array in logarithmic time.', 'Logarithmic search dividing the search space in half each comparison step.', 'intermediate', 1, TRUE),
    ('con-00000000-0000-0000-0000-000000000002', 'top-00000000-0000-0000-0000-000000000001', 'Two-Pointer Technique', 'two-pointer-technique', 'An algorithmic pattern using two pointers to scan an array from opposite ends or at differing speeds.', 'Efficient array scanning avoiding nested O(N^2) loops.', 'intermediate', 2, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Concepts for Trees & Hierarchies
INSERT INTO public.concepts (id, topic_id, name, slug, summary, short_description, difficulty, order_index, is_active)
VALUES
    ('con-00000000-0000-0000-0000-000000000003', 'top-00000000-0000-0000-0000-000000000003', 'Binary Search Tree', 'binary-search-tree', 'A node-based binary tree data structure where each node has a key greater than all keys in its left subtree and less than those in its right.', 'Ordered binary tree enabling O(log N) average insertions, deletions, and lookups.', 'intermediate', 1, TRUE),
    ('con-00000000-0000-0000-0000-000000000004', 'top-00000000-0000-0000-0000-000000000003', 'Tree Traversals', 'tree-traversals', 'Systematic ways of visiting all nodes in a hierarchical tree: In-Order, Pre-Order, Post-Order, and Level-Order.', 'Systematic depth-first and breadth-first exploration patterns for tree nodes.', 'beginner', 2, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Learning Modules for Binary Search Tree
INSERT INTO public.learning_modules (id, concept_id, title, slug, description, learning_objective, difficulty_level, estimated_minutes, display_order, is_active, why_it_matters, simple_explanation, technical_explanation, visualization_type, experiment_type, simulation_config, application_notes, prerequisites)
VALUES
    ('mod-00000000-0000-0000-0000-000000000001', 'con-00000000-0000-0000-0000-000000000003', 'Foundations of Binary Search Trees', 'bst-foundations', 'Understand the fundamental BST ordering invariant and how pointers maintain ordered hierarchies.', 'Understand how the BST invariant enables logarithmic search over dynamic data.', 'intermediate', 20, 1, TRUE,
     'Arrays provide fast binary search but slow O(N) insertions. Linked lists allow fast insertions but slow O(N) searches. Binary Search Trees combine the benefits of both, providing O(log N) search, insertion, and deletion.',
     'A Binary Search Tree is like an organized library where every book to your left has a smaller number, and every book to your right has a bigger number. You never have to search the whole room—you just pick left or right at each shelf.',
     'A Binary Search Tree (BST) is an asymmetric tree structure satisfying the BST invariant: for every node N with key K, all nodes in the left subtree have keys strictly less than K, and all nodes in the right subtree have keys strictly greater than K. Average-case time complexity for search, insert, and delete is O(h) where h is the tree height. For balanced trees, h = floor(log2 N).',
     'interactive-tree', 'parameter-tuning', '{"root": 50, "default_values": [30, 70, 20, 40, 60, 80]}'::jsonb,
     'Relational database indexes (B-Trees) and compiler symbol tables derive directly from hierarchical binary search tree principles.',
     '["Pointers & Memory", "Recursion Basics"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Lessons for Foundations of Binary Search Trees
INSERT INTO public.lessons (id, module_id, title, slug, content_type, content, display_order, estimated_minutes, is_active)
VALUES
    ('les-00000000-0000-0000-0000-000000000001', 'mod-00000000-0000-0000-0000-000000000001', 'The BST Invariant & Structural Mechanics', 'the-bst-invariant', 'explanation',
     '### What is the BST Invariant?

The defining characteristic of a Binary Search Tree is the **BST Invariant**:
- For any given node `X`, every key in its **left subtree** is strictly smaller than `X.key`.
- Every key in its **right subtree** is strictly greater than `X.key`.
- Both the left and right subtrees must also be valid binary search trees.

```
       50
     /    \
   30      70
  /  \    /  \
 20  40  60  80
```

### Why Do We Need BSTs?
Consider the fundamental tradeoff in core data structures:
1. **Sorted Array**: Search is fast ($O(\log N)$ via Binary Search), but insertion requires shifting memory, taking $O(N)$ time.
2. **Linked List**: Insertion at pointer is $O(1)$, but search requires linear traversal, taking $O(N)$ time.
3. **Binary Search Tree**: By combining pointer-based node allocation with hierarchical binary partitioning, both search and insertion achieve $O(\log N)$ on average.',
     1, 7, TRUE),

    ('les-00000000-0000-0000-0000-000000000002', 'mod-00000000-0000-0000-0000-000000000001', 'Search & Insertion Walkthrough', 'search-insertion-walkthrough', 'example',
     '### How BST Search Operates

When searching for key `target` starting from node `current`:
1. If `current == null`, the key does not exist in the tree.
2. If `target == current.key`, the search succeeds!
3. If `target < current.key`, recursively search `current.left`.
4. If `target > current.key`, recursively search `current.right`.

```python
def bst_search(node, target):
    if not node or node.key == target:
        return node
    if target < node.key:
        return bst_search(node.left, target)
    return bst_search(node.right, target)
```

### Worst-Case Degeneracy
If keys are inserted in strictly sorted order (e.g., `10, 20, 30, 40, 50`), each new node becomes a right child of the previous one. The tree degenerates into a singly linked list with height $O(N)$, causing search time to degrade to $O(N)$. This motivates self-balancing structures like AVL Trees and Red-Black Trees.',
     2, 8, TRUE),

    ('les-00000000-0000-0000-0000-000000000003', 'mod-00000000-0000-0000-0000-000000000001', 'Core Takeaways & Complexity Reference', 'core-takeaways-complexity', 'key_points',
     '### Key Points to Remember

- **Search Time**: $O(\log N)$ average, $O(N)$ worst-case (skewed).
- **Insertion Time**: $O(\log N)$ average, $O(N)$ worst-case.
- **In-Order Traversal Property**: Performing an in-order traversal (Left $\to$ Root $\to$ Right) on any valid BST always yields keys in strictly sorted ascending order.
- **Space Complexity**: $O(N)$ total memory, plus $O(h)$ auxiliary stack frames during recursive operations.

### Practical Engineering Insight
In production systems, raw unbalanced BSTs are rarely used directly because real-world workloads often contain pre-sorted sequences. Instead, databases and runtime standard libraries employ balanced variants (B-Trees in PostgreSQL/SQLite, Red-Black Trees in C++ `std::map` and Java `TreeMap`).',
     3, 5, TRUE)
ON CONFLICT (id) DO NOTHING;
