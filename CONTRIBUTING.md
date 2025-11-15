# Contributing to Nest AI

Thank you for your interest in contributing to Nest AI! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/nest-ai.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit: `git commit -m "Add your feature"`
7. Push: `git push origin feature/your-feature-name`
8. Create a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linter
npm run lint

# Build for production
npm run build
```

## Code Style

- Use TypeScript for type safety
- Follow the existing code structure
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### TypeScript

```typescript
// Good
interface UserMessage {
  id: string;
  content: string;
  timestamp: Date;
}

// Avoid
const msg: any = { ... };
```

### React Components

```typescript
// Good - Functional components with TypeScript
export function MyComponent({ title }: { title: string }) {
  return <div>{title}</div>;
}

// Use hooks appropriately
const [state, setState] = useState<string>("");
```

## Project Structure

```
src/
├── app/              # Next.js app directory
│   ├── api/         # API routes
│   └── ...
├── components/       # React components
│   ├── ui/          # Base UI components
│   └── ...
├── lib/             # Utility functions
├── types/           # TypeScript types
└── ...
```

## Areas for Contribution

### High Priority

1. **Real API Integration**
   - Replace mock data with actual OWASP Nest API calls
   - Implement proper error handling
   - Add retry logic

2. **MCP Server Enhancement**
   - Implement full MCP protocol
   - Add stdio communication
   - Improve tool definitions

3. **Testing**
   - Add unit tests (Jest)
   - Add integration tests
   - Add E2E tests (Playwright)

### Medium Priority

4. **UI Improvements**
   - Add more components from 21st.dev
   - Improve mobile responsiveness
   - Add dark/light mode toggle
   - Enhance accessibility

5. **Features**
   - Conversation history
   - User preferences
   - Bookmarks
   - Export functionality

6. **Performance**
   - Add caching layer
   - Optimize bundle size
   - Improve loading states

### Low Priority

7. **Documentation**
   - API documentation
   - Component documentation
   - Tutorial videos

8. **Internationalization**
   - Multi-language support
   - RTL support

## Testing Guidelines

### Unit Tests

```typescript
// Example test
import { formatDate } from '@/lib/utils';

describe('formatDate', () => {
  it('should format recent dates correctly', () => {
    const now = new Date();
    expect(formatDate(now)).toBe('Just now');
  });
});
```

### Integration Tests

Test API routes and component interactions.

### E2E Tests

Test complete user flows.

## Pull Request Process

1. **Update Documentation**: Update README.md if needed
2. **Add Tests**: Include tests for new features
3. **Check Linting**: Run `npm run lint`
4. **Build Successfully**: Ensure `npm run build` works
5. **Describe Changes**: Write clear PR description
6. **Link Issues**: Reference related issues

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added
- [ ] All tests pass
```

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add conversation history
fix: resolve API timeout issue
docs: update installation guide
style: format code with prettier
refactor: simplify card component
test: add unit tests for utils
chore: update dependencies
```

## Code Review

All submissions require review. We'll:
- Check code quality
- Verify tests pass
- Ensure documentation is updated
- Test functionality

## Community

- Be respectful and inclusive
- Help others learn
- Share knowledge
- Give constructive feedback

## Questions?

- Open an issue for bugs
- Start a discussion for features
- Join OWASP Slack #project-nest

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to Nest AI! 🎉
