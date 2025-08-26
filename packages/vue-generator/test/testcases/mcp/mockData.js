/**
 * MCP 测试用例的模拟数据
 */

// 基础 MCP 应用模式
export const mcpAppSchemaBasic = {
  i18n: {
    zh_CN: {
      'app.title': '测试应用',
      'nav.home': '首页',
      'nav.products': '产品'
    },
    en_US: {
      'app.title': 'Test App',
      'nav.home': 'Home',
      'nav.products': 'Products'
    }
  },
  utils: [],
  dataSource: {
    list: []
  },
  globalState: [
    {
      id: 'user',
      state: {
        currentUser: null,
        isLoggedIn: false,
        token: ''
      },
      actions: {
        login: {
          type: 'JSFunction',
          value: 'function login(email, password) { /* login logic */ }'
        },
        logout: {
          type: 'JSFunction',
          value: 'function logout() { /* logout logic */ }'
        }
      },
      getters: {
        userName: {
          type: 'JSFunction',
          value: 'function userName() { return this.currentUser?.name || "Guest" }'
        }
      }
    }
  ],
  pageSchema: [
    {
      componentName: 'div',
      fileName: 'Home',
      meta: {
        id: 1,
        isHome: true,
        isPage: true,
        parentId: '0',
        rootElement: 'div',
        route: '/home',
        router: '/home',
        name: 'Home'
      },
      props: {
        className: 'home-page'
      },
      children: [
        {
          componentName: 'h1',
          props: {
            text: '欢迎使用 MCP 应用'
          }
        }
      ],
      lifeCycles: {},
      methods: {},
      state: [],
      css: '.home-page { padding: 20px; }'
    },
    {
      componentName: 'div',
      fileName: 'Products',
      meta: {
        id: 2,
        isHome: false,
        isPage: true,
        parentId: '0',
        rootElement: 'div',
        route: '/products',
        router: '/products',
        name: 'Products'
      },
      props: {
        className: 'products-page'
      },
      children: [
        {
          componentName: 'h1',
          props: {
            text: '产品列表'
          }
        }
      ],
      lifeCycles: {},
      methods: {},
      state: [],
      css: '.products-page { padding: 20px; }'
    }
  ],
  blockSchema: [],
  componentsMap: [
    {
      componentName: 'div',
      destructuring: false,
      package: '',
      version: ''
    },
    {
      componentName: 'h1',
      destructuring: false,
      package: '',
      version: ''
    }
  ],
  meta: {
    name: 'mcp-test-app',
    description: 'MCP 测试应用程序'
  }
}

// 完整 MCP 应用模式（包含更多状态和页面）
export const mcpAppSchemaFull = {
  ...mcpAppSchemaBasic,
  globalState: [
    ...mcpAppSchemaBasic.globalState,
    {
      id: 'products',
      state: {
        items: [],
        loading: false,
        selectedProduct: null
      },
      actions: {
        fetchProducts: {
          type: 'JSFunction',
          value: 'async function fetchProducts() { /* fetch products */ }'
        },
        selectProduct: {
          type: 'JSFunction',
          value: 'function selectProduct(product) { this.selectedProduct = product }'
        }
      },
      getters: {
        productCount: {
          type: 'JSFunction',
          value: 'function productCount() { return this.items.length }'
        }
      }
    },
    {
      id: 'cart',
      state: {
        items: [],
        total: 0
      },
      actions: {
        addToCart: {
          type: 'JSFunction',
          value: 'function addToCart(product) { /* add to cart */ }'
        },
        removeFromCart: {
          type: 'JSFunction',
          value: 'function removeFromCart(productId) { /* remove from cart */ }'
        }
      },
      getters: {
        cartItemCount: {
          type: 'JSFunction',
          value: 'function cartItemCount() { return this.items.length }'
        }
      }
    }
  ],
  pageSchema: [
    ...mcpAppSchemaBasic.pageSchema,
    {
      componentName: 'div',
      fileName: 'Cart',
      meta: {
        id: 3,
        isHome: false,
        isPage: true,
        parentId: '0',
        rootElement: 'div',
        route: '/cart',
        router: '/cart',
        name: 'Cart'
      },
      props: {
        className: 'cart-page'
      },
      children: [
        {
          componentName: 'h1',
          props: {
            text: '购物车'
          }
        }
      ],
      lifeCycles: {},
      methods: {},
      state: [],
      css: '.cart-page { padding: 20px; }'
    },
    {
      componentName: 'div',
      fileName: 'Profile',
      meta: {
        id: 4,
        isHome: false,
        isPage: true,
        parentId: '0',
        rootElement: 'div',
        route: '/profile',
        router: '/profile',
        name: 'Profile'
      },
      props: {
        className: 'profile-page'
      },
      children: [
        {
          componentName: 'h1',
          props: {
            text: '个人中心'
          }
        }
      ],
      lifeCycles: {},
      methods: {},
      state: [],
      css: '.profile-page { padding: 20px; }'
    }
  ],
  dataSource: {
    list: [
      {
        id: 1,
        name: 'userApi',
        data: {
          url: '/api/users',
          method: 'GET',
          params: {}
        }
      },
      {
        id: 2,
        name: 'productsApi',
        data: {
          url: '/api/products',
          method: 'GET',
          params: {}
        }
      }
    ]
  }
}

// 无用户状态的应用模式
export const mcpAppSchemaNoUser = {
  ...mcpAppSchemaBasic,
  globalState: [
    {
      id: 'theme',
      state: {
        mode: 'light',
        primaryColor: '#007bff'
      },
      actions: {
        setTheme: {
          type: 'JSFunction',
          value: 'function setTheme(mode) { this.mode = mode }'
        }
      },
      getters: {
        isDark: {
          type: 'JSFunction',
          value: 'function isDark() { return this.mode === "dark" }'
        }
      }
    }
  ]
}

// 最小化应用模式（仅导航）
export const mcpAppSchemaMinimal = {
  i18n: {
    zh_CN: {
      'app.title': '最小应用'
    },
    en_US: {
      'app.title': 'Minimal App'
    }
  },
  utils: [],
  dataSource: {
    list: []
  },
  globalState: [],
  pageSchema: [
    {
      componentName: 'div',
      fileName: 'Home',
      meta: {
        id: 1,
        isHome: true,
        isPage: true,
        parentId: '0',
        rootElement: 'div',
        route: '/home',
        router: '/home',
        name: 'Home'
      },
      props: {
        className: 'home-page'
      },
      children: [
        {
          componentName: 'h1',
          props: {
            text: '首页'
          }
        }
      ],
      lifeCycles: {},
      methods: {},
      state: [],
      css: '.home-page { padding: 20px; }'
    }
  ],
  blockSchema: [],
  componentsMap: [
    {
      componentName: 'div',
      destructuring: false,
      package: '',
      version: ''
    },
    {
      componentName: 'h1',
      destructuring: false,
      package: '',
      version: ''
    }
  ],
  meta: {
    name: 'minimal-mcp-app',
    description: '最小化 MCP 应用程序'
  }
}

// MCP 配置选项
export const mcpConfigFull = {
  enabled: true,
  agentRoot: 'https://agent.opentiny.design/api/v1/webmcp-trial/',
  sessionId: '78b66563-95c0-4839-8007-e8af634dd658',
  capabilities: {
    prompts: { listChanged: true },
    resources: { subscribe: true, listChanged: true },
    tools: { listChanged: true },
    completions: {},
    logging: {}
  },
  tools: {
    navigation: true,
    theme: true,
    user: true,
    application: true
  },
  customTools: []
}

export const mcpConfigMinimal = {
  enabled: true,
  tools: {
    navigation: true,
    theme: false,
    user: false,
    application: false
  }
}

export const mcpConfigDisabled = {
  enabled: false
}

export const mcpConfigCustom = {
  enabled: true,
  agentRoot: 'https://custom-agent.example.com/',
  sessionId: 'custom-session-123',
  tools: {
    navigation: true,
    theme: true,
    user: false,
    application: true
  },
  customTools: [
    {
      name: 'custom-tool',
      implementation: `
        server.registerTool(
          "custom-tool",
          {
            title: "自定义工具",
            description: "这是一个自定义工具",
            inputSchema: {
              message: z.string().describe("消息内容")
            }
          },
          async ({ message }) => {
            return {
              content: [{ type: "text", text: \`收到消息：\${message}\` }]
            }
          }
        )
      `
    }
  ]
}
