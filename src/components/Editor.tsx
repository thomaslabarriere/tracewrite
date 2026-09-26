"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor as TipTapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface Props {
  initialContent: string;
  onTextChange: (text: string) => void;
  onReady: (editor: TipTapEditor) => void;
}

export default function Editor({ initialContent, onTextChange, onReady }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Evidence summary draft editor",
      },
    },
    onUpdate: ({ editor: e }) => onTextChange(e.getText()),
  });

  useEffect(() => {
    if (editor) {
      onReady(editor);
      onTextChange(editor.getText());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div className="editor-wrap">
      <EditorContent editor={editor} />
    </div>
  );
}
