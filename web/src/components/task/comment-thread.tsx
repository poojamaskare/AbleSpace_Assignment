"use client";

import { SendHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";

import { useSession } from "@/components/auth/session-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Comment, UserSummary } from "@/lib/types";

/** "just now" / "5m" / "3h" / "2 Sep" — the design's relative comment stamps. */
function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Composer({
  placeholder,
  onSubmit,
  author,
}: {
  placeholder: string;
  onSubmit: (body: string) => void;
  author: UserSummary;
}) {
  const [body, setBody] = useState("");

  return (
    <form
      className="flex items-center gap-2 px-3 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = body.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
        setBody("");
      }}
    >
      <Avatar className="size-6 shrink-0">
        <AvatarImage src={author.avatarUrl ?? undefined} alt="" />
        <AvatarFallback className="text-[9px]">
          {author.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 bg-transparent text-sm outline-none"
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={!body.trim()}
        aria-label="Send"
      >
        <SendHorizontal className="size-4" />
      </Button>
    </form>
  );
}

export function CommentThread({
  comments,
  onCreate,
  onDelete,
}: {
  comments: Comment[];
  onCreate: (body: string, parentId?: string) => void;
  onDelete: (id: string) => void;
}) {
  const me = useSession();

  // The API returns a flat list; group replies under their parent so the one
  // level of nesting the design shows renders correctly.
  const roots = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">Comments</h2>

      {roots.map((comment) => (
        <div key={comment.id} className="rounded-lg border">
          <div className="flex items-start gap-2 px-3 pt-3">
            <Avatar className="size-6 shrink-0">
              <AvatarImage src={comment.author.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="text-[9px]">
                {comment.author.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-xs">
                <span className="font-medium">{comment.author.name}</span>
                <span className="text-muted-foreground">{timeAgo(comment.createdAt)}</span>
              </p>
              <p className="mt-0.5 text-sm break-words">{comment.body}</p>
            </div>
            {comment.author.id === me.id ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Delete comment"
                onClick={() => onDelete(comment.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            ) : null}
          </div>

          {repliesOf(comment.id).map((reply) => (
            <div key={reply.id} className="flex items-start gap-2 border-t px-3 py-2 pl-10">
              <Avatar className="size-5 shrink-0">
                <AvatarImage src={reply.author.avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="text-[8px]">
                  {reply.author.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{reply.author.name}</span>
                  <span className="text-muted-foreground">{timeAgo(reply.createdAt)}</span>
                </p>
                <p className="mt-0.5 text-sm break-words">{reply.body}</p>
              </div>
              {reply.author.id === me.id ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label="Delete reply"
                  onClick={() => onDelete(reply.id)}
                >
                  <Trash2 className="size-3" />
                </Button>
              ) : null}
            </div>
          ))}

          <div className="border-t">
            <Composer
              author={me}
              placeholder="Leave a reply…"
              onSubmit={(body) => onCreate(body, comment.id)}
            />
          </div>
        </div>
      ))}

      <div className="rounded-lg border">
        <Composer
          author={me}
          placeholder="Add a comment…"
          onSubmit={(body) => onCreate(body)}
        />
      </div>
    </section>
  );
}
