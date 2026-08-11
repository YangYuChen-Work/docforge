// ======================================================
// module-data.js  — Mock data for 产品模块智能选配 & 模块配置规则库
// ======================================================

// -------------------- 任务列表 --------------------
var MODULE_TASKS = [
    {
        id: 'MC-2026-001',
        title: 'XCT200G8-1 改型配置',
        desc: '200吨 · 高海拔 · 标准底盘 · Top-down',
        product: '汽车起重机',
        status: 'configuring',
        statusLabel: '配置中',
        updatedAt: '今天 15:22',
        action: '继续'
    },
    {
        id: 'MC-2026-002',
        title: 'XCT200G8-1 回转系统优化',
        desc: '平台匹配98% · 回转系统需调整',
        product: 'P8000-Gen3',
        status: 'pending',
        statusLabel: '待确认',
        updatedAt: '今天 11:40',
        action: '确认'
    },
    {
        id: 'MC-2026-003',
        title: 'XCT200G8-1 初始BOM校验',
        desc: '平台/系统已推荐 · 组件待计算',
        product: '整车BOM',
        status: 'checking',
        statusLabel: '待校验',
        updatedAt: '昨天 18:05',
        action: '校验'
    },
    {
        id: 'MC-2026-004',
        title: 'XCA130 液压子系统选配',
        desc: '成本最优 + 库存充足策略',
        product: '全地面起重机',
        status: 'exportable',
        statusLabel: '可导出',
        updatedAt: '05-24 09:18',
        action: '导出'
    },
    {
        id: 'MC-2026-005',
        title: 'XGC260 主起升系统配置',
        desc: '可靠性优先 · 专业负责人已确认',
        product: '履带起重机',
        status: 'archived',
        statusLabel: '已归档',
        updatedAt: '05-18 14:30',
        action: '查看'
    }
];

// -------------------- 平台需求参数 --------------------
var MODULE_PLATFORM_PARAMS = {
    productCategories: ['汽车起重机', '全地面起重机', '履带起重机'],
    selectedCategory: '汽车起重机',
    requirementSource: 'MCM / 设计导航 / PDM 已返回整机需求 58 项',
    requirementBreakdown: {
        total: 58,
        platform: 12,
        upperLower: 18,
        bomNodes: 28
    },
    params: [
        { label: '最大起重量', value: '200 t', editable: true },
        { label: '主臂长度', value: '73 m', editable: true },
        { label: '作业半径', value: '12 m', editable: true },
        { label: '支腿形式', value: 'H型支腿', editable: true },
        { label: '排放标准', value: '国六', editable: true },
        { label: '典型工况', value: '风电吊装', editable: true }
    ],
    recommendationWeights: [
        { label: '吨位与臂长覆盖', weight: '35%' },
        { label: '成熟平台复用率', weight: '25%' },
        { label: '关键系统接口一致性', weight: '25%' },
        { label: '成本与可靠性约束', weight: '15%' }
    ],
    platforms: [
        { id: 'P8000-Gen3', name: 'P8000-Gen3 平台', match: 96, selected: true,
          desc: '覆盖200t吨位、主臂73m、H型支腿；复用度86%', badge: '已选' },
        { id: 'P8000-Gen2', name: 'P8000-Gen2 改型', match: 89, selected: false,
          desc: '需调整臂架与液压能力；改型工量中等', badge: '候选' },
        { id: 'new-platform', name: '新平台开发', match: 78, selected: false,
          desc: '需求满足但复用度低，建议作为备选方案', badge: '候选' }
    ]
};

// -------------------- 子平台推荐数据 --------------------
var MODULE_SUBSYSTEM_DATA = {
    upperPlatform: {
        title: '上车平台推荐',
        status: '待选择',
        params: [
            { label: '作业高度', value: '高海拔' },
            { label: '回转稳定性', value: '优先' },
            { label: '臂架级数', value: '五节臂' },
            { label: '控制精度', value: '高精度' }
        ],
        solutions: [
            { id: 'SUP-A', name: 'SUP-A 高海拔上车平台', match: 100, status: 'best', badge: '100%匹配',
              bomPreview: [
                { name: '上车平台BOM - SUP-A', level: 0, status: 'green' },
                { name: '主起重系统', level: 1, status: 'green' },
                { name: '伸缩液压子系统', level: 2, status: 'orange' },
                { name: '臂内电气子系统', level: 2, status: 'green' },
                { name: '回转系统（高海拔型）', level: 2, status: 'green' },
                { name: '回转液压子系统', level: 3, status: 'green' },
                { name: '回转支承组件', level: 3, status: 'green' }
              ]
            },
            { id: 'SUP-B', name: 'SUP-B 高精度上车平台', match: 92, status: 'alt', badge: '92%匹配',
              bomPreview: [
                { name: '上车平台BOM - SUP-B', level: 0, status: 'green' },
                { name: '主起重系统', level: 1, status: 'green' },
                { name: '伸缩液压子系统', level: 2, status: 'green' },
                { name: '臂内电气子系统', level: 2, status: 'green' },
                { name: '回转系统（标准型）', level: 2, status: 'red' },
                { name: '回转液压子系统', level: 3, status: 'gray' },
                { name: '回转支承组件', level: 3, status: 'green' }
              ]
            },
            { id: 'SUP-C', name: 'SUP-C 经济型上车平台', match: 78, status: 'alt', badge: '78%匹配',
              bomPreview: [
                { name: '上车平台BOM - SUP-C', level: 0, status: 'green' },
                { name: '主起重系统', level: 1, status: 'orange' },
                { name: '伸缩液压子系统', level: 2, status: 'red' },
                { name: '臂内电气子系统', level: 2, status: 'green' },
                { name: '回转系统（经济型）', level: 2, status: 'gray' },
                { name: '回转液压子系统', level: 3, status: 'gray' },
                { name: '回转支承组件', level: 3, status: 'green' }
              ]
            }
        ]
    },
    lowerPlatform: {
        title: '下车平台推荐',
        status: '待选择',
        params: [
            { label: '底盘形式', value: '专用底盘' },
            { label: '驱动方式', value: '混合动力' },
            { label: '承载等级', value: '重载' },
            { label: '转向模式', value: '多桥转向' }
        ],
        solutions: [
            { id: 'LOW-A', name: 'LOW-A 重载下车平台', match: 100, status: 'best', badge: '100%匹配',
              bomPreview: [
                { name: '下车平台BOM - LOW-A', level: 0, status: 'green' },
                { name: '底盘结构系统', level: 1, status: 'green' },
                { name: '驱动桥系统', level: 2, status: 'green' },
                { name: '转向系统', level: 2, status: 'green' },
                { name: '制动系统', level: 2, status: 'orange' }
              ]
            },
            { id: 'LOW-B', name: 'LOW-B 混动下车平台', match: 88, status: 'alt', badge: '88%匹配',
              bomPreview: [
                { name: '下车平台BOM - LOW-B', level: 0, status: 'green' },
                { name: '底盘结构系统', level: 1, status: 'green' },
                { name: '混合动力系统', level: 2, status: 'orange' },
                { name: '转向系统', level: 2, status: 'green' },
                { name: '制动系统', level: 2, status: 'green' }
              ]
            },
            { id: 'LOW-C', name: 'LOW-C 轻量化下车平台', match: 72, status: 'alt', badge: '72%匹配',
              bomPreview: [
                { name: '下车平台BOM - LOW-C', level: 0, status: 'green' },
                { name: '底盘结构系统', level: 1, status: 'orange' },
                { name: '轻量桥系统', level: 2, status: 'orange' },
                { name: '转向系统', level: 2, status: 'gray' },
                { name: '制动系统', level: 2, status: 'red' }
              ]
            }
        ]
    },
    bomPreview: {
        title: '上车平台BOM - P8000-SUP',
        nodes: [
            { name: '上车平台BOM - P8000-SUP', level: 0, status: 'green' },
            { name: '主起重系统', level: 1, status: 'green' },
            { name: '伸缩液压子系统', level: 2, status: 'orange' },
            { name: '臂内电气子系统', level: 2, status: 'green' },
            { name: '回转系统', level: 2, status: 'red' },
            { name: '回转液压子系统', level: 3, status: 'gray' },
            { name: '回转支承组件', level: 3, status: 'green' }
        ]
    }
};

// -------------------- BOM 树节点数据 --------------------
var MODULE_BOM_TREE = [
    { id: 'root', name: '上车平台BOM - P8000-SUP', level: 0, status: 'green', children: ['boom', 'ext', 'elec', 'rot'] },
    { id: 'boom', name: '主起重系统', level: 1, status: 'green', children: ['ext-hyd', 'valve', 'pipe', 'stroke', 'elec-inner'] },
    { id: 'ext-hyd', name: '伸缩液压子系统', level: 2, status: 'blue', children: ['cyl', 'valve-seq', 'pipe2', 'stroke2', 'seal'] },
    { id: 'cyl', name: '伸缩油缸组件', level: 3, status: 'green', children: [] },
    { id: 'valve-seq', name: '顺序阀组组件', level: 3, status: 'gray', children: [] },
    { id: 'pipe2', name: '液压管路组件', level: 3, status: 'gray', children: [] },
    { id: 'stroke2', name: '行程检测组件', level: 3, status: 'green', children: [] },
    { id: 'seal', name: '安装密封件', level: 3, status: 'gray', children: [] },
    { id: 'elec-inner', name: '臂内电气子系统', level: 2, status: 'green', children: ['prox', 'reel', 'oil'] },
    { id: 'prox', name: '接近开关组件', level: 3, status: 'green', children: [] },
    { id: 'reel', name: '电缆卷筒组件', level: 3, status: 'green', children: [] },
    { id: 'oil', name: '油压传感器', level: 3, status: 'green', children: [] },
    { id: 'rot', name: '回转系统', level: 1, status: 'red', children: ['rot-hyd', 'rot-brg', 'rot-brake', 'rot-lub'] },
    { id: 'rot-hyd', name: '回转液压子系统', level: 2, status: 'gray', children: [] },
    { id: 'rot-brg', name: '回转支承组件', level: 2, status: 'green', children: [] },
    { id: 'rot-brake', name: '回转制动组件', level: 2, status: 'green', children: [] },
    { id: 'rot-lub', name: '回转润滑组件', level: 2, status: 'gray', children: [] }
];

// BOM统计
var MODULE_BOM_STATS = { match100: 5, multiSolution: 1, unmatched: 4, conflict: 1 };

// -------------------- BOM节点详情（按节点ID） --------------------
var MODULE_NODE_DETAILS = {
    'rot': {
        type: 'conflict',
        nodeId: 'rot',
        nodeName: '回转系统',
        statusLabel: '需求冲突',
        baselineInfo: '当前基线：SYS-ROT-02 / G-Drive 回转系统',
        currentParamsBasic: [
            { label: '作业海拔', value: '≥4000m' },
            { label: '稳定性', value: '回转优先' },
            { label: '安装接口', value: '沿用基线' },
            { label: '防护等级', value: 'IP65' }
        ],
        currentParamsPerf: [
            { label: '速度', value: '0-2.0', unit: 'r/min', editable: true },
            { label: '扭矩', value: '520kNm', unit: '', editable: true },
            { label: '制动', value: '双制动', unit: '', editable: true },
            { label: '接口', value: '沿用', unit: '', editable: true }
        ],
        conflicts: [
            { item: '高海拔稳定性', result: '不满足', status: 'conflict' },
            { item: '压力/流量余量', result: '不足', status: 'conflict' },
            { item: '安装接口', result: '可沿用', status: 'pass' }
        ],
        solutions: [
            { id: 'A', name: '高海拔增强回转系统', desc: '解决高海拔稳定性、压力/流量余量不足两个冲突点。', recommended: true,
              impact: {
                summary: '方案A：高海拔增强回转系统。解决高海拔稳定性、压力/流量余量不足两个冲突点。',
                nodes: [
                    { name: '回转系统 → SYS-ROT-08H · 推荐采用', status: 'orange' },
                    { name: '回转液压子系统 · 自动匹配', status: 'orange' },
                    { name: '回转支承组件 · 保留', status: 'green' },
                    { name: '回转制动组件 · 同步升级', status: 'orange' },
                    { name: '回转润滑组件 · 补充', status: 'gray' }
                ],
                downstream: '液压子系统  压力/流量余量<br>制动组件  双制动策略<br>润滑组件  温度/粉尘参数'
              }
            },
            { id: 'B', name: '液压能力增强包', desc: '保留主结构，增强液压能力', recommended: false,
              impact: {
                summary: '方案B：液压能力增强包。保留主结构，仅增强液压子系统压力/流量。',
                nodes: [
                    { name: '回转系统 → SYS-ROT-02-M1 · 改型', status: 'orange' },
                    { name: '回转液压子系统 · 增强匹配', status: 'green' },
                    { name: '回转支承组件 · 保留', status: 'green' },
                    { name: '回转制动组件 · 保留', status: 'green' },
                    { name: '回转润滑组件 · 待确认', status: 'gray' }
                ],
                downstream: '液压子系统  增强压力/流量<br>制动组件  沿用基线<br>润滑组件  待确认'
              }
            }
        ],
        impact: {
            summary: '方案A：高海拔增强回转系统。解决高海拔稳定性、压力/流量余量不足两个冲突点。',
            nodes: [
                { name: '回转系统 → SYS-ROT-08H · 推荐采用', status: 'orange' },
                { name: '回转液压子系统 · 自动匹配', status: 'orange' },
                { name: '回转支承组件 · 保留', status: 'green' },
                { name: '回转制动组件 · 同步升级', status: 'orange' },
                { name: '回转润滑组件 · 补充', status: 'gray' }
            ]
        }
    },
    'ext-hyd': {
        type: 'multi',
        nodeId: 'ext-hyd',
        nodeName: '伸缩液压子系统',
        statusLabel: '当前节点多方案',
        baselineDesc: '该节点来自上车平台BOM。系统根据当前节点需求参数返回多个可采用方案，需要确认采用哪一个型号。',
        currentParamsBasic: [
            { label: '伸缩级数', value: '五节臂' },
            { label: '最大行程', value: '12.5m' },
            { label: '控制精度', value: '高精度' },
            { label: '安装接口', value: '沿用基线' }
        ],
        currentParamsPerf: [
            { label: '行程', value: '12.5m', editable: true },
            { label: '压力', value: '31.5MPa', editable: true },
            { label: '阀控', value: '不限', editable: true },
            { label: '策略', value: '可靠性', editable: true }
        ],
        solutions: [
            { id: 'A', name: '顺序伸缩液压系统', desc: '各节臂依次顺序伸出/缩回，逻辑清晰，适合标准工况', match: 100, badge: '备选',
              impact: {
                summary: '方案A 顺序伸缩液压系统。各节臂顺序动作，沿用基线接口，影响3个下级节点。',
                nodes: [
                    { name: '伸缩液压子系统 → 顺序伸缩液压系统', status: 'green' },
                    { name: '伸缩油缸组件 · 已匹配', status: 'green' },
                    { name: '顺序阀组件 · 待确认', status: 'gray' },
                    { name: '液压管路组件 · 待确认', status: 'gray' },
                    { name: '行程检测组件 · 已匹配', status: 'green' },
                    { name: '安装密封件 · 待确认', status: 'gray' }
                ],
                downstream: '阀控方式 顺序阀控<br>响应时间 ≤0.8s<br>接口约束 沿用基线<br>冗余等级 标准'
              }
            },
            { id: 'B', name: '同步伸缩液压系统', desc: '多节臂同步伸出/缩回，速度快，适合高效率场景', match: 98, badge: '备选',
              impact: {
                summary: '方案B 同步伸缩液压系统。多节臂同步动作，控制精度更高，但需阀组下级确认。',
                nodes: [
                    { name: '伸缩液压子系统 → 同步伸缩液压系统', status: 'green' },
                    { name: '伸缩油缸组件 · 已匹配', status: 'green' },
                    { name: '同步阀组件 · 新增', status: 'blue' },
                    { name: '液压管路组件 · 待确认', status: 'gray' },
                    { name: '行程检测组件 · 已匹配', status: 'green' },
                    { name: '安装密封件 · 待确认', status: 'gray' }
                ],
                downstream: '阀控方式 同步阀控<br>响应时间 ≤0.5s<br>接口约束 需改动<br>冗余等级 标准'
              }
            },
            { id: 'C', name: '混合伸缩液压系统', desc: '顺序与同步混合控制，兼顾速度与可靠性，成本略高', match: 96, badge: '备选',
              impact: {
                summary: '方案C 混合伸缩液压系统。顺序与同步混合控制，可靠性更高，但成本与交期增加。',
                nodes: [
                    { name: '伸缩液压子系统 → 混合伸缩液压系统', status: 'green' },
                    { name: '伸缩油缸组件 · 已匹配', status: 'green' },
                    { name: '混合控制阀组 · 新增', status: 'blue' },
                    { name: '液压管路组件 · 待确认', status: 'gray' },
                    { name: '行程检测组件 · 已匹配', status: 'green' },
                    { name: '安装密封件 · 待确认', status: 'gray' }
                ],
                downstream: '阀控方式 混合阀控<br>响应时间 ≤0.4s<br>接口约束 需改动<br>冗余等级 双冗余'
              }
            }
        ],
        impact: {
            current: '方案A为当前候选，影响3个下级节点。',
            nodes: [
                { name: '伸缩液压子系统 → 方案A', status: 'green' },
                { name: '伸缩油缸组件 · 已匹配', status: 'green' },
                { name: '顺序阀组件 · 待确认', status: 'gray' },
                { name: '液压管路组件 · 待确认', status: 'gray' },
                { name: '行程检测组件 · 已匹配', status: 'green' },
                { name: '安装密封件 · 待确认', status: 'gray' }
            ],
            downstream: {
                valveControl: '顺序阀控',
                responseTime: '≤0.8s',
                interfaceConstraint: '沿用基线',
                redundancyLevel: '标准'
            }
        }
    },
    'valve-seq': {
        type: 'unmatched',
        nodeId: 'valve-seq',
        nodeName: '顺序阀组组件',
        statusLabel: '未匹配',
        desc: '层级来自上车平台BOM，但需求参数缺少值，系统暂无法推荐具体方案。',
        params: [
            { label: '阀组流量', value: '' },
            { label: '控制方式', value: '' },
            { label: '压力等级', value: '' },
            { label: '接口规格', value: '' },
            { label: '安装空间', value: '' },
            { label: '防护要求', value: '' }
        ],
        unmatchedReason: '缺少阀组流量、压力等级、接口规格等关键参数。',
        unmatchedHint: '补录后AI将重新检索参数数据库/规则库，并返回候选选方案。',
        bomPosition: [
            { name: '顺序阀组件 · 未匹配', status: 'gray' },
            { name: '待推荐型号', status: 'gray' },
            { name: '待生成下级结构', status: 'gray' }
        ],
        solutions: [
            { id: 'A', name: 'VLV-SEQ-31.5 顺序阀组件', desc: '沿用平台基线接口，标准型顺序阀控', match: 100, badge: '备选',
              impact: {
                summary: '方案A：VLV-SEQ-31.5 顺序阀组件。沿用平台基线接口，满足基本需求。',
                nodes: [
                    { name: '顺序阀组件 → VLV-SEQ-31.5', status: 'green' },
                    { name: '安装接口包 · 自动匹配', status: 'gray' },
                    { name: '密封圈组件 · 待确认', status: 'gray' }
                ],
                downstream: '阀控方式 顺序阀控<br>流量 80 L/min<br>压力 31.5 MPa<br>接口 SAE 标准'
              }
            },
            { id: 'B', name: 'VLV-PROP-31.5 电比例阀组件', desc: '电比例控制，精度更高，带出下级确认', match: 95, badge: '备选',
              impact: {
                summary: '方案B：VLV-PROP-31.5 电比例阀组件。控制精度更高，但会带出阀组下级确认。',
                nodes: [
                    { name: '顺序阀组件 → VLV-PROP-31.5', status: 'green' },
                    { name: '电比例阀组 · 新增', status: 'blue' },
                    { name: '密封圈组件 · 待确认', status: 'gray' }
                ],
                downstream: '阀控方式 电比例控制<br>流量 80 L/min<br>压力 31.5 MPa<br>接口 需改动'
              }
            }
        ]
    },
    'valve-seq-filled': {
        type: 'unmatched-filled',
        nodeId: 'valve-seq',
        nodeName: '顺序阀组组件',
        statusLabel: '未匹配',
        params: [
            { label: '阀组流量', value: '80 L/min' },
            { label: '控制方式', value: '电比例控制' },
            { label: '压力等级', value: '31.5 MPa' },
            { label: '接口规格', value: 'SAE 标准' },
            { label: '安装空间', value: '180 mm内' },
            { label: '防护要求', value: 'IP65' }
        ],
        recommendedSolution: {
            id: 'A', name: 'VLV-SEQ-31.5', badge: '推荐',
            desc: '顺序阀组件·沿用平台基线接口'
        },
        impact: [
            { name: '顺序阀组件 → VLV-SEQ-31.5', status: 'green' },
            { name: '安装接口包 · 自动匹配', status: 'gray' },
            { name: '密封圈组件 · 待确认', status: 'gray' }
        ]
    },
    'root': {
        type: 'summary',
        nodeId: 'root',
        nodeName: '上车平台BOM - P8000-SUP',
        statusLabel: '平台级BOM',
        desc: '当前BOM为上车平台BOM，基于已确认的P8000-Gen3平台生成。各子节点状态如左侧BOM树所示。',
        summaryStats: { green: 5, blue: 1, gray: 4, red: 1 },
        children: [
            { name: '主起重系统', status: 'green', detail: '已匹配' },
            { name: '回转系统', status: 'red', detail: '需求冲突' }
        ]
    },
    'boom': {
        type: 'confirmed',
        nodeId: 'boom',
        nodeName: '主起重系统',
        statusLabel: '100%匹配',
        desc: '主起重系统需求与基线BOM完全匹配，所有下级节点已确认或处理中。',
        baseline: { id: 'SYS-BOOM-73M', name: '主起重系统', version: '沿用平台基线' },
        params: [
            { label: '最大起重量', value: '200 t' },
            { label: '主臂长度', value: '73 m' },
            { label: '作业半径', value: '12 m' },
            { label: '支腿形式', value: 'H型支腿' }
        ],
        children: [
            { name: '伸缩液压子系统', status: 'blue', detail: '多方案' },
            { name: '臂内电气子系统', status: 'green', detail: '已匹配' },
            { name: '顺序阀组组件', status: 'gray', detail: '未匹配' },
            { name: '液压管路组件', status: 'gray', detail: '未匹配' },
            { name: '行程检测组件', status: 'green', detail: '已匹配' },
            { name: '安装密封件', status: 'gray', detail: '未匹配' },
            { name: '伸缩油缸组件', status: 'green', detail: '已匹配' }
        ]
    },
    'cyl': {
        type: 'confirmed',
        nodeId: 'cyl',
        nodeName: '伸缩油缸组件',
        statusLabel: '100%匹配',
        desc: '伸缩油缸组件与基线完全匹配，无需额外操作。',
        baseline: { id: 'CYL-EXT-1250', name: '伸缩油缸组件', version: '沿用平台基线' },
        params: [
            { label: '油缸行程', value: '12.5 m' },
            { label: '推力', value: '9.42 kN' },
            { label: '缸径', value: '180 mm' },
            { label: '接口', value: '沿用基线' }
        ],
        children: []
    },
    'stroke2': {
        type: 'confirmed',
        nodeId: 'stroke2',
        nodeName: '行程检测组件',
        statusLabel: '100%匹配',
        desc: '行程检测组件与基线完全匹配，无需额外操作。',
        baseline: { id: 'SENS-STROKE-01', name: '行程检测组件', version: '沿用平台基线' },
        params: [
            { label: '检测范围', value: '0-15 m' },
            { label: '精度', value: '±2 mm' },
            { label: '接口', value: '沿用基线' },
            { label: '防护', value: 'IP65' }
        ],
        children: []
    },
    'elec-inner': {
        type: 'confirmed',
        nodeId: 'elec-inner',
        nodeName: '臂内电气子系统',
        statusLabel: '100%匹配',
        desc: '臂内电气子系统与基线完全匹配，所有下级节点均已确认。',
        baseline: { id: 'SUB-ELEC-03', name: '臂内电气子系统', version: '沿用平台基线' },
        params: [
            { label: '电压等级', value: '24V DC' },
            { label: '通讯', value: 'CAN总线' },
            { label: '接口', value: '沿用基线' },
            { label: '防护', value: 'IP65' }
        ],
        children: [
            { name: '接近开关组件', status: 'green', detail: '已匹配' },
            { name: '电缆卷筒组件', status: 'green', detail: '已匹配' },
            { name: '油压传感器', status: 'green', detail: '已匹配' }
        ]
    },
    'prox': {
        type: 'confirmed',
        nodeId: 'prox',
        nodeName: '接近开关组件',
        statusLabel: '100%匹配',
        desc: '接近开关组件与基线完全匹配，无需额外操作。',
        baseline: { id: 'SENS-PROX-02', name: '接近开关组件', version: '沿用平台基线' },
        params: [
            { label: '检测距离', value: '8 mm' },
            { label: '输出', value: 'PNP' },
            { label: '接口', value: '沿用基线' },
            { label: '防护', value: 'IP67' }
        ],
        children: []
    },
    'reel': {
        type: 'confirmed',
        nodeId: 'reel',
        nodeName: '电缆卷筒组件',
        statusLabel: '100%匹配',
        desc: '电缆卷筒组件与基线完全匹配，无需额外操作。',
        baseline: { id: 'CABLE-DRUM-02', name: '电缆卷筒组件', version: '沿用平台基线' },
        params: [
            { label: '卷筒容量', value: '50 m' },
            { label: '电缆规格', value: '4×2.5' },
            { label: '接口', value: '沿用基线' },
            { label: '防护', value: 'IP65' }
        ],
        children: []
    },
    'oil': {
        type: 'confirmed',
        nodeId: 'oil',
        nodeName: '油压传感器',
        statusLabel: '100%匹配',
        desc: '油压传感器与基线完全匹配，无需额外操作。',
        baseline: { id: 'SENS-PRES-01', name: '油压传感器', version: '沿用平台基线' },
        params: [
            { label: '量程', value: '0-40 MPa' },
            { label: '精度', value: '±0.5%FS' },
            { label: '接口', value: '沿用基线' },
            { label: '防护', value: 'IP67' }
        ],
        children: []
    },
    'rot-hyd': {
        type: 'unmatched',
        nodeId: 'rot-hyd',
        nodeName: '回转液压子系统',
        statusLabel: '未匹配',
        desc: '回转液压子系统当前未匹配方案，需补录参数后系统推荐候选方案。',
        params: [
            { label: '压力等级', value: '' },
            { label: '流量需求', value: '' },
            { label: '接口规格', value: '' },
            { label: '防护等级', value: '' }
        ],
        unmatchedReason: '缺少压力等级、流量需求、接口规格等关键参数。',
        unmatchedHint: '补录后AI将重新检索参数数据库/规则库，并返回候选方案。',
        bomPosition: [
            { name: '回转液压子系统 · 未匹配', status: 'gray' },
            { name: '待推荐型号', status: 'gray' }
        ],
        solutions: [
            { id: 'A', name: 'SUB-HYD-07A 增强型回转液压', desc: '压力/流量余量增强，满足高海拔工况', match: 100, badge: '备选',
              impact: {
                summary: '方案A：SUB-HYD-07A 增强型回转液压。压力/流量余量增强，满足高海拔工况。',
                nodes: [
                    { name: '回转液压子系统 → SUB-HYD-07A', status: 'green' },
                    { name: '液压泵组件 · 自动匹配', status: 'green' },
                    { name: '回转马达 · 待确认', status: 'gray' }
                ],
                downstream: '压力 31.5 MPa<br>流量 120 L/min<br>接口 沿用基线<br>防护 IP65'
              }
            },
            { id: 'B', name: 'SUB-HYD-05 标准型回转液压', desc: '标准压力/流量，成本更优', match: 92, badge: '备选',
              impact: {
                summary: '方案B：SUB-HYD-05 标准型回转液压。标准压力/流量，成本更优。',
                nodes: [
                    { name: '回转液压子系统 → SUB-HYD-05', status: 'green' },
                    { name: '液压泵组件 · 自动匹配', status: 'green' },
                    { name: '回转马达 · 待确认', status: 'gray' }
                ],
                downstream: '压力 25 MPa<br>流量 100 L/min<br>接口 沿用基线<br>防护 IP65'
              }
            }
        ]
    },
    'rot-brake': {
        type: 'confirmed',
        nodeId: 'rot-brake',
        nodeName: '回转制动组件',
        statusLabel: '100%匹配',
        desc: '回转制动组件与基线完全匹配，无需额外操作。',
        baseline: { id: 'CMP-LUBR-HT', name: '回转制动组件', version: '沿用平台基线' },
        params: [
            { label: '制动型式', value: '湿式多片' },
            { label: '制动力矩', value: '≥28 kNm' },
            { label: '接口', value: '沿用基线' },
            { label: '防护', value: 'IP65' }
        ],
        children: []
    },
    'rot-lub': {
        type: 'unmatched',
        nodeId: 'rot-lub',
        nodeName: '回转润滑组件',
        statusLabel: '未匹配',
        desc: '回转润滑组件当前未匹配方案，需补录参数后系统推荐候选方案。',
        params: [
            { label: '润滑方式', value: '' },
            { label: '油品', value: '' },
            { label: '接口规格', value: '' },
            { label: '防护等级', value: '' }
        ],
        unmatchedReason: '缺少润滑方式、油品、接口规格等关键参数。',
        unmatchedHint: '补录后AI将重新检索参数数据库/规则库，并返回候选方案。',
        bomPosition: [
            { name: '回转润滑组件 · 未匹配', status: 'gray' },
            { name: '待推荐型号', status: 'gray' }
        ],
        solutions: [
            { id: 'A', name: 'CMP-LUBR-HT 高温型润滑组件', desc: '适用于高粉尘、高温工况，自带温控', match: 98, badge: '备选',
              impact: {
                summary: '方案A：CMP-LUBR-HT 高温型润滑组件。适用于高粉尘、高温工况。',
                nodes: [
                    { name: '回转润滑组件 → CMP-LUBR-HT', status: 'green' },
                    { name: '润滑管路 · 自动匹配', status: 'gray' }
                ],
                downstream: '润滑方式 集中润滑<br>油品 合成高温脂<br>接口 沿用基线<br>防护 IP65'
              }
            },
            { id: 'B', name: 'CMP-LUBR-STD 标准型润滑组件', desc: '标准工况适用，成本更低', match: 90, badge: '备选',
              impact: {
                summary: '方案B：CMP-LUBR-STD 标准型润滑组件。标准工况适用，成本更低。',
                nodes: [
                    { name: '回转润滑组件 → CMP-LUBR-STD', status: 'green' },
                    { name: '润滑管路 · 自动匹配', status: 'gray' }
                ],
                downstream: '润滑方式 集中润滑<br>油品 标准润滑脂<br>接口 沿用基线<br>防护 IP54'
              }
            }
        ]
    },
    'pipe2': {
        type: 'unmatched',
        nodeId: 'pipe2',
        nodeName: '液压管路组件',
        statusLabel: '未匹配',
        desc: '液压管路组件当前未匹配方案，需补录参数后系统推荐候选方案。',
        params: [
            { label: '管路通径', value: '' },
            { label: '压力等级', value: '' },
            { label: '接口规格', value: '' },
            { label: '防护等级', value: '' }
        ],
        unmatchedReason: '缺少管路通径、压力等级、接口规格等关键参数。',
        unmatchedHint: '补录后AI将重新检索参数数据库/规则库，并返回候选方案。',
        bomPosition: [
            { name: '液压管路组件 · 未匹配', status: 'gray' },
            { name: '待推荐型号', status: 'gray' }
        ],
        solutions: [
            { id: 'A', name: 'PIPE-HD-25 重载管路组件', desc: '通径25mm，满足高压力/流量余量', match: 100, badge: '备选',
              impact: {
                summary: '方案A：PIPE-HD-25 重载管路组件。通径25mm，满足高压力/流量余量。',
                nodes: [
                    { name: '液压管路组件 → PIPE-HD-25', status: 'green' },
                    { name: '管接头 · 自动匹配', status: 'gray' },
                    { name: '密封件 · 待确认', status: 'gray' }
                ],
                downstream: '管路通径 25mm<br>压力 31.5 MPa<br>接口 SAE 标准<br>防护 IP65'
              }
            },
            { id: 'B', name: 'PIPE-STD-20 标准管路组件', desc: '通径20mm，成本更优', match: 88, badge: '备选',
              impact: {
                summary: '方案B：PIPE-STD-20 标准管路组件。通径20mm，成本更优。',
                nodes: [
                    { name: '液压管路组件 → PIPE-STD-20', status: 'green' },
                    { name: '管接头 · 自动匹配', status: 'gray' },
                    { name: '密封件 · 待确认', status: 'gray' }
                ],
                downstream: '管路通径 20mm<br>压力 25 MPa<br>接口 SAE 标准<br>防护 IP54'
              }
            }
        ]
    },
    'seal': {
        type: 'unmatched',
        nodeId: 'seal',
        nodeName: '安装密封件',
        statusLabel: '未匹配',
        desc: '安装密封件当前未匹配方案，需补录参数后系统推荐候选方案。',
        params: [
            { label: '密封型式', value: '' },
            { label: '材料', value: '' },
            { label: '接口规格', value: '' },
            { label: '防护等级', value: '' }
        ],
        unmatchedReason: '缺少密封型式、材料、接口规格等关键参数。',
        unmatchedHint: '补录后AI将重新检索参数数据库/规则库，并返回候选方案。',
        bomPosition: [
            { name: '安装密封件 · 未匹配', status: 'gray' },
            { name: '待推荐型号', status: 'gray' }
        ],
        solutions: [
            { id: 'A', name: 'SEAL-HD-FKM 高温氟胶密封件', desc: '耐高温、耐腐蚀，满足高海拔工况', match: 98, badge: '备选',
              impact: {
                summary: '方案A：SEAL-HD-FKM 高温氟胶密封件。耐高温、耐腐蚀，满足高海拔工况。',
                nodes: [
                    { name: '安装密封件 → SEAL-HD-FKM', status: 'green' },
                    { name: 'O型圈 · 自动匹配', status: 'gray' }
                ],
                downstream: '密封型式 组合密封<br>材料 氟橡胶FKM<br>接口 沿用基线<br>防护 IP65'
              }
            },
            { id: 'B', name: 'SEAL-STD-NBR 标准丁腈密封件', desc: '标准工况适用，成本更低', match: 90, badge: '备选',
              impact: {
                summary: '方案B：SEAL-STD-NBR 标准丁腈密封件。标准工况适用，成本更低。',
                nodes: [
                    { name: '安装密封件 → SEAL-STD-NBR', status: 'green' },
                    { name: 'O型圈 · 自动匹配', status: 'gray' }
                ],
                downstream: '密封型式 O型圈<br>材料 丁腈橡胶NBR<br>接口 沿用基线<br>防护 IP54'
              }
            }
        ]
    },
    'rot-brg': {
        type: 'unique',
        nodeId: 'rot-brg',
        nodeName: '回转支承组件',
        statusLabel: '100%匹配 · 唯一方案',
        desc: '中间仅展示当前节点关联需求参数。参数可编辑，修改后可重新核；当前核结果为唯一一匹配。',
        params: [
            { label: '回转载荷', value: '≥520 kNm' },
            { label: '齿圈形式', value: '外齿式' },
            { label: '安装接口', value: '沿用P8000' },
            { label: '防护等级', value: 'IP65' }
        ],
        baseline: {
            id: 'CMP-SLEW-630',
            name: '外齿式回转支承组件',
            version: '沿用平台基线'
        },
        baselineChecks: [
            { item: '承载能力', result: '满足', status: 'pass' },
            { item: '安装接口', result: '一致', status: 'pass' },
            { item: '防护等级', result: '满足', status: 'pass' },
            { item: '候选方案数量', result: '1个', status: 'unique', note: '唯一' }
        ],
        calcResult: 'AI已调用接口核承载能力：安全系数 1.28，满足规范要求。',
        downstreamPreview: [
            { name: '回转支承组件 · 已确认', status: 'green' },
            { name: '安装螺栓包 · 已匹配', status: 'green' },
            { name: '密封圈组件 · 已匹配', status: 'green' },
            { name: '润滑接口 · 未匹配', status: 'gray' }
        ]
    }
};

// -------------------- BOM生成确认数据 --------------------
var MODULE_BOM_CONFIRM = {
    title: '生成上车平台配置BOM',
    desc: '这里是最终生成确认页；所有节点处理完成后，按层级预览即将生成的上车平台配置BOM。',
    baseline: {
        platform: '上车平台BOM - P8000-SUP',
        replaced: '伸缩液压子系统 SUB-EXT-07A',
        reshaped: '回转系统 SYS-ROT-02-M1',
        supplemented: '顺序阀组件参数并匹配方案'
    },
    bomNodes: [
        { level: 0, name: '上车平台配置BOM - P8000-SUP-CFG', code: 'P8000-SUP-CFG', change: '生成', changeType: 'generate' },
        { level: 1, name: '主起重系统', code: 'SYS-BOOM-73M', change: '沿用', changeType: 'keep' },
        { level: 2, name: '伸缩液压子系统', code: 'SUB-EXT-07A', change: '替换', changeType: 'replace' },
        { level: 3, name: '伸缩油缸组件', code: 'CYL-EXT-1250', change: '沿用', changeType: 'keep' },
        { level: 3, name: '顺序阀组件', code: 'VALVE-SEQ-31.5', change: '新增', changeType: 'add' },
        { level: 2, name: '臂内电气子系统', code: 'SUB-ELEC-03', change: '沿用', changeType: 'keep' },
        { level: 3, name: '电缆卷筒组件', code: 'CABLE-DRUM-02', change: '删除', changeType: 'delete' },
        { level: 1, name: '回转系统', code: 'SYS-ROT-08H', change: '方案采用', changeType: 'solution' },
        { level: 2, name: '回转液压子系统', code: 'SUB-HYD-07A', change: '替换', changeType: 'replace' },
        { level: 2, name: '回转支承组件', code: 'CMP-SLEW-630', change: '沿用', changeType: 'keep' },
        { level: 2, name: '回转制动组件', code: 'CMP-LUBR-HT', change: '沿用', changeType: 'keep' }
    ],
    calcNote: '回转/液压参数计算接口返回：压力余量满足、管路推荐通径25mm、油缸推力9.42kN。结果将随配置BOM写入设计导航。',
    summary: {
        platformBaseline: 'P8000-Gen3 已载入',
        nodeChanges: '替换 2 · 改型 1 · 删除 1 · 新增 1',
        conflictStatus: '无红色冲突、无橙色待选、无灰色未匹配',
        calcStatus: 'AI自动调用接口完成，结果已采用',
        generateTarget: '设计导航配置BOM',
        targetDesc: '生成到设计导航，不走导出流程',
        changeRecord: '保留基线BOM、需求、动作、计算结果'
    }
};

// -------------------- 模块配置规则库数据 --------------------
var MODULE_RULES_DATA = {
    stats: { rules: 48, formulas: 26 },
    assets: [
        { id: 'rule-1', name: '模块化配置规则', desc: '产品平台/子系统/总成组件推荐规则', status: 'active', statusLabel: '已启用' },
        { id: 'rule-2', name: '参数库', desc: '吨位、底盘、工况、成本、可靠性等参数定义', status: 'active', statusLabel: '已启用' },
        { id: 'rule-3', name: '公式库', desc: '液压、动力、结构负计算公式', status: 'active', statusLabel: '已启用' },
        { id: 'rule-4', name: '知识图谱映射', desc: 'MCM/设计导航实体关系与相似案例', status: 'pending', statusLabel: '待完善' },
        { id: 'rule-5', name: '成熟度基线', desc: '产品平台成熟度、版本和复用等级', status: 'active', statusLabel: '已启用' },
        { id: 'rule-6', name: 'PDM字段映射', desc: '重量、物料编码、版本状态字段映射', status: 'checking', statusLabel: '待校验' }
    ],
    ruleDetail: {
        id: 'rule-1',
        name: '四层Top-down推荐',
        status: 'active',
        statusLabel: '已启用',
        applicableProducts: ['汽车起重机 / 全地面起重机'],
        recommendPath: '产品平台 → 系统 → 子系统 → 总成组件；各层推荐结果与设计需求自动对比。',
        strategyAlgorithm: '规则匹配算法、相似度检索算法、多约束寻优算法、业务数据解析算法。',
        relatedFormulas: '液压缸推力、马达转速、管路通径、重量约束、成本估算。',
        baselineKnowledge: '复用MCM模块结构、设计导航任务链路、PDM版本信息，持续沉淀相似改型方案。'
    }
};

// -------------------- AI需求助手推荐策略 --------------------
var MODULE_STRATEGIES = [
    { name: '成本最优 + 库存充足', desc: '优先使用已有库存与成熟方案' },
    { name: '性能优先', desc: '针对高性能或极端工况场景' },
    { name: '可靠性优先', desc: '专业/重载工况，降低故障风险' }
];
