/**
 * Build a nested reply tree from a flat list of replies.
 * Single flat query → JS-side tree construction.
 */

export interface FlatReply {
  id: string;
  content: string;
  postId: string;
  userId: string;
  parentId: string | null;
  voteScore: number;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: string | null;
    username: string | null;
    avatarUrl: string | null;
  } | null;
  currentUserVote?: number | null;
}

export interface ReplyTreeNode {
  id: string;
  content: string;
  author: {
    id: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  voteScore: number;
  currentUserVote: number | null;
  createdAt: Date;
  updatedAt: Date;
  depth: number;
  collapsed: boolean;
  children: ReplyTreeNode[];
}

const COLLAPSE_DEPTH = 5;

/**
 * Converts a flat array of replies into a nested tree structure.
 * Replies with parentId = null are root-level (direct replies to the post).
 */
export function buildReplyTree(flatReplies: FlatReply[]): ReplyTreeNode[] {
  const nodeMap = new Map<string, ReplyTreeNode>();
  const roots: ReplyTreeNode[] = [];

  // First pass: create all nodes
  for (const reply of flatReplies) {
    nodeMap.set(reply.id, {
      id: reply.id,
      content: reply.content,
      author: reply.author || { id: null, username: null, avatarUrl: null },
      voteScore: reply.voteScore,
      currentUserVote: reply.currentUserVote ?? null,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
      depth: 0,
      collapsed: false,
      children: [],
    });
  }

  // Second pass: build parent-child relationships
  for (const reply of flatReplies) {
    const node = nodeMap.get(reply.id)!;
    if (reply.parentId && nodeMap.has(reply.parentId)) {
      const parent = nodeMap.get(reply.parentId)!;
      node.depth = parent.depth + 1;
      node.collapsed = node.depth >= COLLAPSE_DEPTH;
      parent.children.push(node);
    } else {
      // Root-level reply
      node.depth = 0;
      roots.push(node);
    }
  }

  // Propagate depth for deeply nested children
  function setDepths(node: ReplyTreeNode, depth: number) {
    node.depth = depth;
    node.collapsed = depth >= COLLAPSE_DEPTH;
    for (const child of node.children) {
      setDepths(child, depth + 1);
    }
  }
  for (const root of roots) {
    setDepths(root, 0);
  }

  return roots;
}
