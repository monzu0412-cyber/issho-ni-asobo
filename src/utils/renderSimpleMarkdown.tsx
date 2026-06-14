import type { ReactNode } from 'react'

function isListLine(line: string) {
  return line.startsWith('* ')
}

function isBlockStart(line: string) {
  return (
    line.startsWith('# ')
    || line.startsWith('## ')
    || line === '---'
    || isListLine(line)
  )
}

export function renderSimpleMarkdown(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? ''

    if (!line) {
      index += 1
      continue
    }

    if (line === '---') {
      blocks.push(<hr key={`hr-${index}`} />)
      index += 1
      continue
    }

    if (line.startsWith('# ')) {
      blocks.push(<h1 key={`h1-${index}`}>{line.slice(2)}</h1>)
      index += 1
      continue
    }

    if (line.startsWith('## ')) {
      blocks.push(<h2 key={`h2-${index}`}>{line.slice(3)}</h2>)
      index += 1
      continue
    }

    if (isListLine(line)) {
      const items: string[] = []

      while (index < lines.length && isListLine(lines[index]?.trim() ?? '')) {
        items.push((lines[index]?.trim() ?? '').slice(2))
        index += 1
      }

      blocks.push(
        <ul key={`ul-${index}`}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>,
      )
      continue
    }

    const paragraphLines: string[] = []

    while (
      index < lines.length
      && (lines[index]?.trim() ?? '')
      && !isBlockStart(lines[index]?.trim() ?? '')
    ) {
      paragraphLines.push(lines[index]?.trim() ?? '')
      index += 1
    }

    blocks.push(<p key={`p-${index}`}>{paragraphLines.join(' ')}</p>)
  }

  return blocks
}
