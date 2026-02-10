/**
 * CoordinateAdjuster - 简化版坐标修正
 * 当 NES 返回 predictions 后用户继续编辑，targetLine 可能偏移。
 * 通过 originalLineContent 在当前编辑器内容中重新定位。
 */

import type * as monaco from 'monaco-editor'
import type { Prediction } from '../types'

export class CoordinateAdjuster {
  /** 搜索范围：目标行上下各 SEARCH_RADIUS 行 */
  private static readonly SEARCH_RADIUS = 5

  /**
   * 修正单个 prediction 的 targetLine
   * 策略：以 originalLineContent 为锚点，在 targetLine ± SEARCH_RADIUS 范围内搜索匹配行
   * @returns 修正后的 prediction（targetLine 可能被更新），如果找不到匹配则返回 null
   */
  static adjust(prediction: Prediction, model: monaco.editor.ITextModel): Prediction | null {
    const { targetLine, originalLineContent } = prediction

    // 没有 originalLineContent 无法修正，保持原样
    if (!originalLineContent) {
      return prediction
    }

    const totalLines = model.getLineCount()
    const trimmedOriginal = originalLineContent.trim()

    // 先检查原始行是否仍然匹配
    if (targetLine >= 1 && targetLine <= totalLines) {
      if (model.getLineContent(targetLine).trim() === trimmedOriginal) {
        return prediction
      }
    }

    // 在 ± SEARCH_RADIUS 范围内搜索
    const startLine = Math.max(1, targetLine - CoordinateAdjuster.SEARCH_RADIUS)
    const endLine = Math.min(totalLines, targetLine + CoordinateAdjuster.SEARCH_RADIUS)

    // 优先搜索距离最近的行
    for (let offset = 1; offset <= CoordinateAdjuster.SEARCH_RADIUS; offset++) {
      // 先向下搜索
      const downLine = targetLine + offset
      if (downLine <= endLine && model.getLineContent(downLine).trim() === trimmedOriginal) {
        return { ...prediction, targetLine: downLine }
      }

      // 再向上搜索
      const upLine = targetLine - offset
      if (upLine >= startLine && model.getLineContent(upLine).trim() === trimmedOriginal) {
        return { ...prediction, targetLine: upLine }
      }
    }

    // 找不到匹配行，丢弃该 prediction
    return null
  }

  /**
   * 批量修正 predictions
   * @returns 修正后的有效 predictions（无法定位的会被过滤掉）
   */
  static adjustAll(predictions: Prediction[], model: monaco.editor.ITextModel): Prediction[] {
    return predictions
      .map((pred) => CoordinateAdjuster.adjust(pred, model))
      .filter((pred): pred is Prediction => pred !== null)
  }
}
