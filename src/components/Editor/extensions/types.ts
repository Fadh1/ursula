import { InlineDiffNodeAttributes } from './InlineDiffNode'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineDiffNode: {
      insertInlineDiff: (attributes: InlineDiffNodeAttributes) => ReturnType
    }
  }
}

export {}