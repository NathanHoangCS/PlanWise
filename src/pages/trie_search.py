"""
trie_search.py
--------------
A Trie (prefix tree) data structure for fast event title search.

Why a Trie?
  - O(m) search where m = length of query string
  - Much faster than O(n*m) linear scan for large event sets
  - Supports prefix matching — typing "st" finds "Standup", "Study session", etc.
  - Naturally case-insensitive by storing lowercase keys

Structure:
  Each TrieNode has:
    children: dict[char -> TrieNode]
    events:   list of event IDs that end at this node
    is_end:   True if a word ends at this node

Example:
  Inserting "standup" (id=e1) and "study" (id=e2):
    root -> s -> t -> a -> n -> d -> u -> p (is_end, events=[e1])
                  -> u -> d -> y (is_end, events=[e2])

  Search "st" returns events at all descendant nodes = [e1, e2]
"""


class TrieNode:
    def __init__(self):
        self.children: dict = {}    # char -> TrieNode
        self.events:   list = []    # event dicts stored at this node
        self.is_end:   bool = False


class TrieSearch:
    """
    Case-insensitive prefix Trie for searching events by title.

    Operations:
      insert(event)        - O(m) where m = len(title)
      search(prefix)       - O(m + k) where k = number of results
      delete(event_id)     - O(total_nodes) - rebuilds affected paths
      rebuild(events)      - O(n*m) full rebuild
    """

    def __init__(self):
        self.root = TrieNode()
        self._all_events: dict = {}   # id -> event dict for O(1) lookup

    # ── Insert ────────────────────────────────────────────────────────────────

    def insert(self, event: dict) -> None:
        """Insert an event into the Trie by its title. O(m)."""
        title = event.get('title', '').lower().strip()
        if not title:
            return

        self._all_events[event['id']] = event

        node = self.root
        for char in title:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
            # Store event reference at every node along the path
            # so prefix search returns all matching events
            if event not in node.events:
                node.events.append(event)

        node.is_end = True

    # ── Search ────────────────────────────────────────────────────────────────

    def search(self, prefix: str, limit: int = 10) -> list[dict]:
        """
        Return all events whose title starts with prefix. O(m + k).
        m = len(prefix), k = number of matching events.
        """
        if not prefix:
            return []

        prefix = prefix.lower().strip()
        node   = self.root

        # Traverse to the end of the prefix
        for char in prefix:
            if char not in node.children:
                return []   # prefix not found
            node = node.children[char]

        # All events stored at this node match the prefix
        results = list(node.events)

        # Sort by title length (shorter = more exact match first),
        # then alphabetically
        results.sort(key=lambda e: (len(e.get('title', '')), e.get('title', '').lower()))

        return results[:limit]

    # ── Delete ────────────────────────────────────────────────────────────────

    def delete(self, event_id: str) -> None:
        """
        Remove an event from the Trie by ID.
        Uses lazy deletion — removes from all nodes' event lists. O(total_nodes).
        """
        if event_id not in self._all_events:
            return

        self._all_events.pop(event_id)
        self._remove_from_nodes(self.root, event_id)

    def _remove_from_nodes(self, node: TrieNode, event_id: str) -> None:
        """Recursively remove event_id from all nodes."""
        node.events = [e for e in node.events if e.get('id') != event_id]
        for child in node.children.values():
            self._remove_from_nodes(child, event_id)

    # ── Rebuild ───────────────────────────────────────────────────────────────

    def rebuild(self, events: list[dict]) -> None:
        """Rebuild the entire Trie from a list of events. O(n*m)."""
        self.root        = TrieNode()
        self._all_events = {}
        for event in events:
            self.insert(event)

    # ── Stats ─────────────────────────────────────────────────────────────────

    def size(self) -> int:
        """Number of events indexed."""
        return len(self._all_events)

    def node_count(self) -> int:
        """Total number of nodes in the Trie."""
        return self._count_nodes(self.root)

    def _count_nodes(self, node: TrieNode) -> int:
        count = 1
        for child in node.children.values():
            count += self._count_nodes(child)
        return count