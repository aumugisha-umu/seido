import type { Preview } from '@storybook/react'
import '../app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'slate', value: '#f8fafc' },
        { name: 'dark', value: '#1e293b' }
      ]
    },
    layout: 'centered'
  }
}

export default preview
