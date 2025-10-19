import React, { useEffect, useState } from "react";
import { SandpackConsumer } from "@codesandbox/sandpack-react";

export default function EditorPanel({ path, files, updateFile }) {
  // This component is a placeholder if you want to build a custom editor.
  // For now we rely on SandpackCodeEditor inside Provider. Keep it for future extension.
  useEffect(() => {}, [path]);
  return null;
}
