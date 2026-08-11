/* ============================================
   AI Document Assistant - Data Layer
   ============================================ */

var DOC_PROJECTS = [
    { id: 'P001', name: '80t 汽车起重机臂架优化项目', code: 'XG-ZX-2026-042', model: 'XCT80L7', phase: '方案设计', category: '起重机' },
    { id: 'P002', name: '全地面起重机液压系统升级项目', code: 'XG-ZX-2026-031', model: 'XCA130', phase: '需求冻结', category: '起重机' },
    { id: 'P003', name: '履带起重机转台结构轻量化项目', code: 'XG-ZX-2025-118', model: 'XGC260', phase: '试制验证', category: '起重机' },
    { id: 'P004', name: '起重机智能安全监测系统', code: 'XG-ZX-2025-096', model: 'XCT55L6', phase: '详细设计', category: '起重机' },
    { id: 'P005', name: '新能源动力底盘适配项目', code: 'XG-ZX-2025-071', model: 'XCA60_EV', phase: '前期调研', category: '新能源' }
];

var DOC_TEMPLATES = [
    { id: 'T001', name: '总体设计方案', phase: '方案设计', chapters: 9, category: '设计类', desc: '背景、市场需求、总体技术方案、关键部件设计、风险与验证计划、结论' },
    { id: 'T002', name: '产品设计任务书', phase: '立项/需求冻结', chapters: 7, category: '设计类', desc: '项目概述、设计目标、技术要求、进度计划、资源需求、验收标准、附件' },
    { id: 'T003', name: '结构设计说明书', phase: '详细设计', chapters: 8, category: '设计类', desc: '总体布局、载荷分析、结构方案、强度校核、材料选型、工艺要求、试验方案、图纸清单' },
    { id: 'T004', name: '液压系统设计说明书', phase: '详细设计', chapters: 8, category: '设计类', desc: '系统原理、参数计算、元件选型、管路布置、控制逻辑、密封方案、试验要求、维护说明' },
    { id: 'T005', name: '市场需求分析报告', phase: '前期调研', chapters: 6, category: '分析类', desc: '市场现状、竞品分析、客户需求、技术趋势、产品定位、建议方案' },
    { id: 'T006', name: '试制验证方案', phase: '样机试制', chapters: 8, category: '验证类', desc: '验证目标、试验项目、方法标准、设备清单、进度安排、判定准则、风险预案、报告模板' },
    { id: 'T007', name: '设计评审材料', phase: '评审归档', chapters: 5, category: '评审类', desc: '项目概况、设计方案摘要、关键问题与对策、评审结论、后续计划' }
];

var DOC_DOCUMENTS = [
    { id: 'D001', projectId: 'P001', templateId: 'T001', title: '80t 汽车起重机臂架优化 - 总体设计方案', status: 'editing', time: '今天 15:20', meta: '标准模板生成 · 章节资料已关联', type: '总体方案' },
    { id: 'D002', projectId: 'P002', templateId: 'T002', title: '全地面起重机液压系统升级 - 设计任务书', status: 'pending', time: '今天 11:48', meta: '标准模板生成 · 章节资料已关联', type: '设计任务书' },
    { id: 'D003', projectId: 'P003', templateId: 'T006', title: '履带起重机转台轻量化 - 试制验证方案', status: 'draft', time: '昨天 18:02', meta: '标准模板生成 · 章节资料已关联', type: '验证方案' },
    { id: 'D004', projectId: 'P004', templateId: 'T007', title: '起重机智能安全监测 - 设计评审材料', status: 'archived', time: '05-24 09:16', meta: '标准模板生成 · 章节资料已关联', type: '评审材料' },
    { id: 'D005', projectId: 'P005', templateId: 'T005', title: '新能源动力底盘适配 - 市场需求分析报告', status: 'archived', time: '05-18 14:35', meta: '标准模板生成 · 章节资料已关联', type: '分析报告' },
    { id: 'D006', projectId: 'P001', templateId: 'T003', title: '80t 汽车起重机臂架 - 结构设计说明书', status: 'editing', time: '05-16 10:20', meta: '标准模板生成 · 前序文件已匹配', type: '设计说明' },
    { id: 'D007', projectId: 'P002', templateId: 'T004', title: '全地面起重机 - 液压系统设计说明书', status: 'draft', time: '05-12 14:30', meta: '标准模板生成 · 部分资料待补充', type: '设计说明' }
];

var DOC_STATUS_MAP = {
    editing: { label: '编辑中', cls: 'editing' },
    pending: { label: '待补资料', cls: 'pending' },
    draft: { label: '草稿', cls: 'draft' },
    archived: { label: '已归档', cls: 'archived' }
};

/* --- Document Editor Content (per document, per chapter) --- */
var DOC_EDITOR_DATA = {
    'D001': {
        title: '起重机电控系统 PRD',
        outline: [
            { id: 'ch1', title: '1 项目背景', status: 'done', children: [
                { id: 'ch1_1', title: '1.1 业务背景', status: 'done' },
                { id: 'ch1_2', title: '1.2 问题现状', status: 'done' }
            ]},
            { id: 'ch2', title: '2 目标范围', status: 'pending', children: [
                { id: 'ch2_1', title: '2.1 业务目标', status: 'pending' }
            ]},
            { id: 'ch3', title: '3 功能需求', status: 'current', children: [
                { id: 'ch3_1', title: '3.1 电控监测', status: 'current' },
                { id: 'ch3_2', title: '3.2 报警联动', status: 'pending' }
            ]},
            { id: 'ch4', title: '4 验收标准', status: 'pending', children: [] },
            { id: 'ch5', title: '5 风险依赖', status: 'pending', children: [] }
        ],
        chapters: {
            'ch1_1': {
                heading: '1.1 业务背景',
                paragraphs: [
                    { text: '徐工重型起重机产品线目前覆盖 8t-2200t 全系列汽车起重机、全地面起重机和履带起重机。随着产品智能化升级需求日益增长，电控系统作为核心子系统之一，承担了动力管理、安全监测和远程诊断等关键功能。', highlighted: false },
                    { text: '当前电控系统设计文档分散于各项目组，缺乏统一的文档模板和标准化流程，导致设计评审效率低、知识复用困难。本项目旨在通过 AI 文档助手实现标准化文档自动生成。', highlighted: false }
                ],
                table: null,
                annotations: [
                    { id: '引1', type: 'ref1', label: '来源：项目立项书', text: '产品线数据引自 2025 年度项目立项书附件一。', action: '已关联正文第 1 段' }
                ]
            },
            'ch1_2': {
                heading: '1.2 问题现状',
                paragraphs: [
                    { text: '当前主要问题包括：(1) 各项目组独立编写设计文档，格式不统一；(2) 历史项目经验难以快速检索复用；(3) 评审周期长，修改迭代效率低；(4) 缺乏前序文件的自动关联和引用追溯。', highlighted: true },
                    { text: '据统计，单个总体设计方案从初稿到通过评审平均需要 3.2 周，其中 60% 的时间花费在资料收集和格式调整上。', highlighted: false }
                ],
                table: null,
                annotations: [
                    { id: '引1', type: 'ref1', label: '来源：质量部统计', text: '3.2 周周期数据来自 2025Q4 质量部项目过程统计报表。', action: '已验证' },
                    { id: '引2', type: 'ref2', label: '来源：流程审计', text: '60% 时间占比来自 2025 年流程审计报告第 4 章。', action: 'AI 引用 · 待确认' }
                ]
            },
            'ch2_1': {
                heading: '2.1 业务目标',
                paragraphs: [
                    { text: '通过 AI 文档助手实现以下核心目标：', highlighted: false },
                    { text: '• 文档生成效率提升 70%：从资料收集到初稿生成控制在 2 小时内\n• 格式规范率达 100%：严格套用标准模板，消除格式差异\n• 知识复用率提升至 80%：自动匹配历史案例和前序文件\n• 评审通过率首次提升至 85%：基于规则校验减少低级问题', highlighted: true }
                ],
                table: null,
                annotations: []
            },
            'ch3_1': {
                heading: '3.1 电控监测',
                paragraphs: [
                    { text: '系统需要对起重机关键电控信号进行持续采集，包括电源状态、传感器反馈、报警触发条件和执行机构响应。', highlighted: true },
                    { text: '在验收过程中，应记录采样频率、异常持续时间、报警触发阈值和人工复核结果。', highlighted: true },
                    { text: '电控监测模块需要覆盖电源状态、传感器反馈、控制器处理结果和执行机构响应。每一次异常触发都需要保留事件记录，供后续问题定位和验收追溯。', highlighted: false }
                ],
                table: {
                    headers: ['层级', '主要功能', '关键字段'],
                    rows: [
                        ['采集层', '电源状态、传感器反馈', '状态值 / 时间戳'],
                        ['处理层', '规则判断、异常识别', '阈值 / 持续时间'],
                        ['联动层', '报警提示、限制动作', '报警等级 / 动作码'],
                        ['追溯层', '事件记录、人工复核', '复核人 / 结果']
                    ]
                },
                annotations: [
                    { id: '引1', type: 'ref1', label: '来源：市场输入清单', text: '"关键电控信号持续采集"来自项目市场输入清单，引2 历史案例，可直接让 AI 基于来源改写。', action: '已关联正文第 1 段' },
                    { id: '引2', type: 'ref2', label: '来源：历史案例', text: '异常触发与验收追溯参考"70t 臂架优化项目 - 试制验证方案"。', action: 'AI 引用 · 待人工确认' }
                ]
            },
            'ch3_2': {
                heading: '3.2 报警联动',
                paragraphs: [
                    { text: '当监测到异常信号时，系统应根据预设规则自动触发报警，并联动执行相应的安全限制动作。报警等级分为三级：提示(蓝)、警告(橙)、紧急(红)。', highlighted: false },
                    { text: '联动动作包括但不限于：仪表盘声光报警、限制特定操作、强制降速、紧急停机。每次联动需记录触发时间、报警等级、联动动作和操作人员确认状态。', highlighted: false }
                ],
                table: {
                    headers: ['报警等级', '触发条件', '联动动作', '响应时间'],
                    rows: [
                        ['提示(蓝)', '参数偏离正常范围 10%', '仪表提示', '≤500ms'],
                        ['警告(橙)', '参数偏离正常范围 30%', '声光报警 + 限速', '≤200ms'],
                        ['紧急(红)', '安全阈值突破', '强制停机 + 锁定', '≤100ms']
                    ]
                },
                annotations: [
                    { id: '引1', type: 'ref1', label: '来源：安全标准', text: '三级报警分级参考 GB/T 28264-2017 起重机械安全监控管理系统标准。', action: '已验证' }
                ]
            },
            'ch4': {
                heading: '4 验收标准',
                paragraphs: [
                    { text: '本章节待补充。系统应根据模板要求自动生成验收标准框架，包括功能验收、性能验收和文档验收三个维度。', highlighted: false }
                ],
                table: null,
                annotations: []
            },
            'ch5': {
                heading: '5 风险依赖',
                paragraphs: [
                    { text: '本章节待补充。需要识别项目实施过程中的技术风险、进度风险和资源风险，并制定相应的应对措施。', highlighted: false }
                ],
                table: null,
                annotations: []
            }
        }
    }
};

/* --- Config: Template detail rules --- */
var DOC_CONFIG_TEMPLATES = [
    { id: 'CT001', name: '总体设计方案', phase: '方案设计', chapters: 9, category: '设计类', enabled: true,
      fields: {
          phase: '方案设计 / 详细设计前置评审',
          structure: '项目背景、市场需求、总体技术方案、关键部件设计、风险与验证计划、结论',
          aiSupport: '关联项目信息、前序参考文件、向量案例库、模板段落描述；按章节逐段调用。',
          genRule: '每段引用当前章节前序文档、相似历史案例和标题说明，生成后保留人工修改与再润色入口。',
          exportFormat: 'Word、PDF；导出时套用徐工重型研发文档版式'
      }
    },
    { id: 'CT002', name: '产品设计任务书', phase: '立项/需求冻结', chapters: 7, category: '设计类', enabled: true,
      fields: {
          phase: '立项阶段 / 需求冻结前',
          structure: '项目概述、设计目标、技术要求、进度计划、资源需求、验收标准、附件',
          aiSupport: '关联立项书、需求清单、历史同类型任务书；按章节匹配。',
          genRule: '依据模板标题和历史案例逐章生成，保留编辑入口。',
          exportFormat: 'Word、PDF'
      }
    },
    { id: 'CT003', name: '结构设计说明书', phase: '详细设计', chapters: 8, category: '设计类', enabled: true,
      fields: {
          phase: '详细设计阶段',
          structure: '总体布局、载荷分析、结构方案、强度校核、材料选型、工艺要求、试验方案、图纸清单',
          aiSupport: '关联计算报告、材料库、工艺手册、历史结构说明书。',
          genRule: '引用计算结果和材料参数自动填充，人工校核后定稿。',
          exportFormat: 'Word、PDF；含公式和图表'
      }
    },
    { id: 'CT004', name: '液压系统设计说明书', phase: '详细设计', chapters: 8, category: '设计类', enabled: true,
      fields: {
          phase: '详细设计阶段',
          structure: '系统原理、参数计算、元件选型、管路布置、控制逻辑、密封方案、试验要求、维护说明',
          aiSupport: '关联液压计算书、元件手册、历史同类型系统说明。',
          genRule: '参数计算结果自动引用，元件选型基于数据库匹配推荐。',
          exportFormat: 'Word、PDF'
      }
    },
    { id: 'CT005', name: '市场需求分析报告', phase: '前期调研', chapters: 6, category: '分析类', enabled: true,
      fields: {
          phase: '前期调研 / 立项前',
          structure: '市场现状、竞品分析、客户需求、技术趋势、产品定位、建议方案',
          aiSupport: '关联市场数据、竞品资料、客户反馈、行业报告。',
          genRule: '基于数据图表和竞品对比自动生成分析段落，人工补充定性判断。',
          exportFormat: 'Word、PDF、PPT'
      }
    },
    { id: 'CT006', name: '试制验证方案', phase: '样机试制', chapters: 8, category: '验证类', enabled: true,
      fields: {
          phase: '样机试制阶段',
          structure: '验证目标、试验项目、方法标准、设备清单、进度安排、判定准则、风险预案、报告模板',
          aiSupport: '关联设计说明书、标准库、历史验证方案、设备台账。',
          genRule: '试验项目自动匹配标准方法，设备清单从台账中检索。',
          exportFormat: 'Word、PDF'
      }
    },
    { id: 'CT007', name: '设计评审材料', phase: '评审归档', chapters: 5, category: '评审类', enabled: true,
      fields: {
          phase: '评审归档阶段',
          structure: '项目概况、设计方案摘要、关键问题与对策、评审结论、后续计划',
          aiSupport: '关联总体方案、问题清单、会议纪要、历史评审材料。',
          genRule: '自动从总体方案提取摘要，问题清单转化为对策表格。',
          exportFormat: 'Word、PDF、PPT'
      }
    }
];

/* Chat history per chapter */
var DOC_CHAT_HISTORY = {
    'ch3_1': [
        { role: 'user', text: '请结合引1和引2，把选中段落改写成总体设计方案里的正式表达。' },
        { role: 'ai', text: '建议保留两处外部引用来源，并补充采样频率、阈值来源、异常持续时间和复核人字段，使段落更符合设计方案的可追溯要求。', refs: ['引1', '引2'] }
    ],
    'ch1_2': [
        { role: 'user', text: '这段数据的来源可靠吗？需要标注引用吗？' },
        { role: 'ai', text: '建议保留引用标注。3.2 周数据来自质量部统计（引1），60% 占比来自流程审计报告（引2），两者均为内部正式文件，可信度高。建议在正文中以脚注形式标注来源。', refs: ['引1', '引2'] }
    ]
};
