export function escapeRegExp(string: string) {
  // $& means the whole matched string
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function removeInvalidHtmlTags(inputString: string): string {
  const tagRegex: RegExp = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  const stack: { tagName: string; fullTag: string }[] = [];
  const invalidTags: string[] = [];

  // Find all tags and process them
  while ((match = tagRegex.exec(inputString)) !== null) {
    const fullTag: string = match[0];
    const tagName: string = match[1];
    const isClosingTag: boolean = fullTag[1] === "/";

    if (isClosingTag) {
      if (stack.length === 0 || stack[stack.length - 1].tagName !== tagName) {
        // No matching opening tag, mark for removal
        invalidTags.push(fullTag);
      } else {
        // Matching opening tag found, remove it from stack
        stack.pop();
      }
    } else {
      // Opening tag, push to stack with its index for later removal if unmatched
      stack.push({ tagName, fullTag });
    }
  }

  // All remaining tags in stack are unmatched opening tags, mark them for removal
  stack.forEach((tag) => invalidTags.push(tag.fullTag));

  // Remove invalid tags from inputString
  let resultString: string = inputString;
  invalidTags.forEach((tag) => {
    resultString = resultString.replace(tag, "");
  });

  return resultString;
}
