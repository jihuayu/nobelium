import type { Meta, StoryObj } from '@storybook/react'
import * as stylex from '@stylexjs/stylex'
import { RichText } from '../src'
import { colors } from '../src/theme.stylex'
import { demoRichText, demoModel } from './fixtures'

const meta = {
  title: 'Renderer/RichText',
  component: RichText,
  tags: ['autodocs'],
  args: {
    richText: demoRichText,
    linkPreviewMap: demoModel.linkPreviewMap,
    renderOptions: {
      locale: 'zh-CN',
      timeZone: 'Asia/Shanghai',
      dateMention: {
        displayMode: 'relative',
        includeTime: 'always',
        absoluteDateFormat: 'YYYY年M月D日',
        absoluteDateTimeFormat: 'YYYY年M月D日 HH:mm:ss',
        relativeStyle: 'short'
      }
    }
  },
  render: (args) => (
    <div {...stylex.props(styles.content)}>
      <RichText {...args} />
    </div>
  )
} satisfies Meta<typeof RichText>

export default meta

const styles = stylex.create({
  content: {
    color: colors.textPrimary,
    fontSize: '17px',
    lineHeight: '2rem',
    maxWidth: '36rem'
  }
})

type Story = StoryObj<typeof meta>

export const Mentions: Story = {}
