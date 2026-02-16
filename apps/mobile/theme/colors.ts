export const colors = {
  // Primary (Uber Black)
  primary: '#000000',
  primaryLight: '#EEEEEE',
  primaryDark: '#000000',

  // Backgrounds
  background: '#FFFFFF',
  card: '#FFFFFF',
  surface: '#F6F6F6',
  groupedBackground: '#F6F6F6',

  // Text
  text: '#000000',
  textSecondary: '#545454',
  textTertiary: '#AFAFAF',

  // Status colors (slightly more muted/modern Uber style)
  statusReceived: '#EEEEEE',
  statusReview: '#FFC043',
  statusReady: '#276EF1',   // Uber Blue
  statusDispatched: '#05A357', // Uber Green
  statusDelivery: '#276EF1',
  statusDelivered: '#05A357',
  statusCancelled: '#E11900',  // Uber Red

  // Semantic
  success: '#05A357',
  warning: '#FFC043',
  error: '#E11900',
  info: '#276EF1',

  // Borders
  border: '#EEEEEE',
  borderLight: '#F6F6F6',
  separator: '#EEEEEE',
} as const;
