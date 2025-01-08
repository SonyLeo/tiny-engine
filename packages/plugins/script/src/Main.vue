<template>
  <div class="plugin-page-js-container">
    <div class="code-edit-head">
      <div class="head-left">
        <span class="title">页面 JS</span>
        <link-button :href="docsUrl"></link-button>
      </div>
      <div class="head-right">
        <close-icon @close="close"></close-icon>
      </div>
    </div>
    <div class="alert-container">
      <tiny-alert
        description="注意：JS 面板顶层只支持函数声明，其余变量声明、表达式、类声明均不会保存。"
        custom-class="tiny-alert_custom"
        :closable="false"
      />
    </div>
    <div class="code-edit-content">
      <monaco-editor
        ref="monaco"
        :value="state.script"
        :options="options"
        @change="change"
        @editorDidMount="editorDidMount"
      ></monaco-editor>
    </div>
  </div>
</template>

<script>
import { onBeforeUnmount } from 'vue'
import { Alert } from '@opentiny/vue'
import { VueMonaco, CloseIcon, LinkButton } from '@opentiny/tiny-engine-common'
import { useHelp } from '@opentiny/tiny-engine-meta-register'
import { initCompletion } from '@opentiny/tiny-engine-common/js/completion'
import { initLinter } from '@opentiny/tiny-engine-common/js/linter'
import useMethod, { saveMethod, highlightMethod, getMethodNameList, getMethods } from './js/method'

export const api = {
  saveMethod,
  highlightMethod,
  getMethodNameList,
  getMethods
}

export default {
  components: {
    MonacoEditor: VueMonaco,
    CloseIcon,
    LinkButton,
    TinyAlert: Alert
  },
  emits: ['close'],
  setup(props, { emit }) {
    const docsUrl = useHelp().getDocsUrl('script')
    const { state, monaco, change, close, saveMethods } = useMethod({ emit })

    const options = {
      language: 'javascript',
      minimap: {
        enabled: false
      },
      // 禁用滚动条边边一直显示的边框
      overviewRulerBorder: false,
      renderLineHighlightOnlyWhenFocus: true
    }

    const editorDidMount = (editor) => {
      if (!monaco.value) {
        return
      }

      // Lowcode API 提示
      state.completionProvider = initCompletion(monaco.value.getMonaco(), monaco.value.getEditor()?.getModel())

      // 初始化 ESLint worker
      state.linterWorker = initLinter(editor, monaco.value.getMonaco(), state)
    }

    onBeforeUnmount(() => {
      state.completionProvider?.forEach((provider) => {
        provider.dispose()
      })
      // 终止 ESLint worker
      state.linterWorker?.terminate?.()
    })

    return {
      state,
      monaco,
      options,
      close,
      change,
      saveMethods,
      editorDidMount,
      docsUrl
    }
  }
}
</script>

<style lang="less" scoped>
.plugin-page-js-container {
  width: 50vw;
  height: 100%;
  background: var(--ti-lowcode-plugin-js-bg);
  box-shadow: 6px 0px 3px 0px var(--te-base-box-shadow-rgba-3);
  position: absolute;
  left: 0;
  top: 0;
  z-index: 999;
  box-sizing: border-box;

  .code-edit-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--te-common-border-divider);
    padding: 12px 0;

    .head-left {
      padding-left: 12px;
      display: flex;
      align-items: center;
      .title {
        color: var(--ti-lowcode-plugin-panel-title-color);
        font-weight: var(--ti-lowcode-plugin-panel-title-font-weight);
      }

      .help-link {
        display: inline-block;
        margin-left: 20px;
        cursor: pointer;
        color: var(--ti-lowcode-plugin-js-help-link-color);
        &:hover {
          text-decoration: underline;
        }
      }
    }

    .head-right {
      margin-right: 12px;
      display: flex;
      align-items: center;

      .save-btn {
        width: 40px;
        padding: 0;
        min-width: 40px;
        margin-right: 12px;
        height: 24px;
        line-height: 24px;
        .dots {
          width: 6px;
          height: 6px;
          background: var(--ti-lowcode-common-error-color);
          border-radius: 50%;
          position: absolute;
          top: 9px;
          right: 34px;
        }
      }
      .icon-wrap {
        width: auto;
      }
    }
  }

  .code-edit-content {
    padding: 12px;
    height: calc(100% - 54px);

    & > div {
      border: 1px solid var(--ti-lowcode-base-gray-101);
      border-radius: 4px;
      height: 100%;
    }
  }
}
:deep(.help-box) {
  height: auto;
  #help-icon {
    margin-left: 5px;
  }
}

.alert-container {
  padding: 0 12px;

  .tiny-alert_custom {
    border: 0;
    padding: 8px 0;
    margin-top: 12px;
    margin-bottom: 0;
    padding-left: 17px;
    border-radius: 4px;
    background: rgb(240, 247, 255);
  }
}

:deep(.tiny-alert__description) {
  font-weight: 400;
  letter-spacing: 0;
  text-align: left;
}
</style>
