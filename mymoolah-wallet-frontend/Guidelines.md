# MyMoolah Frontend Development Guidelines

**Last Updated:** July 19, 2025 (Git Sync Complete)

## 🎨 **DESIGN SYSTEM GUIDELINES**

### **Logo System**
- **LoginPage**: Use `logo3.svg` with proper error handling
- **RegisterPage**: Use `logo2.svg` at 60% larger size (w-26 h-26)
- **Fallback**: Display "M" logo when SVG fails to load
- **Asset Path**: Always use `/assets/` for logo references

### **Color Scheme**
- **Primary Green**: #86BE41
- **Primary Blue**: #2D8CCA
- **White**: #FFFFFF
- **Gray Scale**: Use Tailwind gray classes for consistency

### **Typography**
- **Font Family**: Montserrat, sans-serif
- **Base Font Size**: 14px (mobile-first)
- **Font Weights**: Use CSS variables for consistency
- **Responsive**: Use clamp() for fluid typography

### **Layout Guidelines**
- **Mobile-First**: Design for mobile devices first
- **Touch Targets**: Minimum 44px for interactive elements
- **Spacing**: Use CSS variables for consistent spacing
- **Border Radius**: Use mobile-optimized border radius

### **Component Guidelines**
- **ImageWithFallback**: Use for robust image handling
- **Real-time Validation**: Provide instant user feedback
- **Progress Indicators**: Visual status tracking
- **Accessibility**: WCAG 2.1 AA compliance required

### **Performance Guidelines**
- **Lazy Loading**: Implement for image-heavy pages
- **Image Optimization**: Use appropriate formats and sizes
- **Caching**: Implement for offline support
- **Low-Cost Devices**: Optimize for affordable devices

---

## 🔧 **TECHNICAL GUIDELINES**

### **Code Organization**
- **Components**: Keep file sizes small and focused
- **Helper Functions**: Extract to separate files
- **Types**: Use TypeScript for type safety
- **Imports**: Use absolute paths when possible

### **State Management**
- **Context API**: Use for global state
- **Local State**: Use useState for component state
- **Form State**: Use controlled components
- **Validation**: Real-time validation with visual feedback

### **Error Handling**
- **Graceful Degradation**: Provide fallbacks for failures
- **User-Friendly Messages**: Clear, actionable error text
- **Loading States**: Show progress for async operations
- **Network Errors**: Handle offline scenarios

### **Security Guidelines**
- **Input Validation**: Sanitize all user inputs
- **File Uploads**: Validate type, size, and content
- **Authentication**: Secure token management
- **Data Protection**: Encrypt sensitive information

---

## 📱 **MOBILE OPTIMIZATION**

### **Touch Interface**
- **Touch Targets**: Minimum 44px for buttons and links
- **Gesture Support**: Implement swipe and pinch gestures
- **Keyboard Handling**: Optimize for mobile keyboards
- **Orientation**: Support portrait and landscape modes

### **Performance**
- **Loading Speed**: Optimize for slow connections
- **Battery Life**: Minimize CPU and network usage
- **Memory Usage**: Efficient component lifecycle
- **Offline Support**: Cache essential resources

### **Accessibility**
- **Screen Readers**: Proper ARIA labels
- **Color Contrast**: WCAG 2.1 AA compliance
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Clear focus indicators

---

## 🎯 **QUALITY ASSURANCE**

### **Testing Requirements**
- **Unit Tests**: Test individual components
- **Integration Tests**: Test component interactions
- **Accessibility Tests**: Verify WCAG compliance
- **Performance Tests**: Monitor loading times

### **Code Review Checklist**
- [ ] TypeScript types are correct
- [ ] Error handling is implemented
- [ ] Accessibility features are present
- [ ] Performance is optimized
- [ ] Mobile responsiveness is verified
- [ ] Security measures are in place

---

*These guidelines ensure consistent, high-quality development of the MyMoolah frontend platform with focus on mobile optimization, accessibility, and performance.*
<!--

System Guidelines

Use this file to provide the AI with rules and guidelines you want it to follow.
This template outlines a few examples of things you can add. You can add your own sections and format it to suit your needs

TIP: More context isn't always better. It can confuse the LLM. Try and add the most important rules you need

# General guidelines

Any general rules you want the AI to follow.
For example:

* Only use absolute positioning when necessary. Opt for responsive and well structured layouts that use flexbox and grid by default
* Refactor code as you go to keep code clean
* Keep file sizes small and put helper functions and components in their own files.

--------------

# Design system guidelines
Rules for how the AI should make generations look like your company's design system

Additionally, if you select a design system to use in the prompt box, you can reference
your design system's components, tokens, variables and components.
For example:

* Use a base font-size of 14px
* Date formats should always be in the format “Jun 10”
* The bottom toolbar should only ever have a maximum of 4 items
* Never use the floating action button with the bottom toolbar
* Chips should always come in sets of 3 or more
* Don't use a dropdown if there are 2 or fewer options

You can also create sub sections and add more specific details
For example:


## Button
The Button component is a fundamental interactive element in our design system, designed to trigger actions or navigate
users through the application. It provides visual feedback and clear affordances to enhance user experience.

### Usage
Buttons should be used for important actions that users need to take, such as form submissions, confirming choices,
or initiating processes. They communicate interactivity and should have clear, action-oriented labels.

### Variants
* Primary Button
  * Purpose : Used for the main action in a section or page
  * Visual Style : Bold, filled with the primary brand color
  * Usage : One primary button per section to guide users toward the most important action
* Secondary Button
  * Purpose : Used for alternative or supporting actions
  * Visual Style : Outlined with the primary color, transparent background
  * Usage : Can appear alongside a primary button for less important actions
* Tertiary Button
  * Purpose : Used for the least important actions
  * Visual Style : Text-only with no border, using primary color
  * Usage : For actions that should be available but not emphasized
-->

- [2025-07-23] RegisterPage.tsx reverted to last working Figma-generated version for stability.
- All refactor attempts (custom hooks, validation extraction) should be incremental and tested after each change.
