// 假数据 - 基于真实测试用例结构
// 输入：中文测试用例描述 Excel
// 输出：测试代码 Excel (变量赋值、断言)

var TASK_DATA = {
    "TC-2026-021": {
        name: "EN13000 拆装工况",
        id: "TC-2026-021",
        status: "confirm",
        statusLabel: "待确认",
        badges: [
            { text: "未匹配 3", type: "red" },
            { text: "验证通过", type: "blue" },
            { text: "待提交", type: "orange" }
        ],
        // ===== 转换预览：树形结构 + 每个节点的步骤详情 =====
        preview: {
            tree: [
                {
                    id: "SetUp_01",
                    level: 1,
                    label: "SetUp_01 拆装工况激活与解除",
                    desc: "进入条件测试",
                    children: ["SetUp_0101"]
                },
                {
                    id: "SetUp_0101",
                    level: 2,
                    label: "SetUp_0101 进入条件",
                    desc: "对应prj",
                    children: ["SetUp_010101", "SetUp_010102", "SetUp_010103", "SetUp_010104"]
                },
                {
                    id: "SetUp_010101",
                    level: 3,
                    label: "SetUp_010101 正常进入",
                    desc: "对应pkj",
                    result: "Passed"
                },
                {
                    id: "SetUp_010102",
                    level: 3,
                    label: "SetUp_010102 手柄不在中位，进入失败",
                    desc: "",
                    result: "Passed"
                },
                {
                    id: "SetUp_010103",
                    level: 3,
                    label: "SetUp_010103 力限器传感器故障，进入失败",
                    desc: "",
                    result: "Passed"
                },
                {
                    id: "SetUp_010104",
                    level: 3,
                    label: "SetUp_010104 发动机熄火，进入失败",
                    desc: "",
                    result: "Passed"
                }
            ],
            // 每个叶子节点的详细步骤（中文输入 vs 代码输出 对照）
            steps: {
                "SetUp_010101": {
                    title: "正常进入",
                    chineseName: "正常进入拆装工况",
                    precondition: {
                        zh: "1.手柄中位",
                        code: "LMIFault_Code1=0",
                        expected: "w_EgineSpeed_Feedback==800"
                    },
                    testSteps: [
                        { zh: "按下拆装工况按键", code: "SetUp_bus_bPanel=1", expected: "" },
                        { zh: "等待500ms", code: "Wait 500 ms", expected: "" },
                        { zh: "松开拆装工况按键", code: "SetUp_bus_bPanel=0", expected: "拆装工况激活" },
                        { zh: "", code: "Wait 3000 ms", expected: "b_SetUp_Valid==1" }
                    ],
                    postcondition: {
                        zh: "恢复初始状态",
                        code: "JoyR_swtPlt_IN=0",
                        expected: ""
                    }
                },
                "SetUp_010102": {
                    title: "手柄不在中位，进入失败",
                    chineseName: "手柄不在中位时尝试进入拆装工况",
                    precondition: {
                        zh: "1.力限器无传感器故障",
                        code: "JoyR_swtPlt_IN=0",
                        expected: "w_EgineSpeed_Feedback==800"
                    },
                    testSteps: [
                        { zh: "手柄处于非中位状态", code: "JoyR_swtPlt_IN=1", expected: "" },
                        { zh: "按下拆装工况按键", code: "SetUp_bus_bPanel=1", expected: "" },
                        { zh: "等待500ms", code: "Wait 2000 ms", expected: "" },
                        { zh: "松开拆装工况按键", code: "SetUp_bus_bPanel=0", expected: "拆装工况未激活" },
                        { zh: "", code: "Wait 3000 ms", expected: "b_SetUp_Valid==0" }
                    ],
                    postcondition: {
                        zh: "恢复手柄位置",
                        code: "JoyR_swtPlt_IN=0",
                        expected: ""
                    }
                },
                "SetUp_010103": {
                    title: "力限器传感器故障，进入失败",
                    chineseName: "力限器传感器故障时尝试进入拆装工况",
                    precondition: {
                        zh: "1.手柄中位",
                        code: "LMIFault_Code1=0",
                        expected: "b_SetUp_Valid==0"
                    },
                    testSteps: [
                        { zh: "力限器传感器故障", code: "LMIFault_Code1=4359", expected: "", note: "边界值法" },
                        { zh: "按下拆装工况按键", code: "SetUp_bus_bPanel=1", expected: "" },
                        { zh: "等待500ms", code: "Wait 2000 ms", expected: "" },
                        { zh: "松开拆装工况按键", code: "SetUp_bus_bPanel=0", expected: "拆装工况未激活" },
                        { zh: "", code: "Wait 3000 ms", expected: "b_SetUp_Valid==0" }
                    ],
                    postcondition: {
                        zh: "清除故障码",
                        code: "LMIFault_Code1=0",
                        expected: ""
                    }
                },
                "SetUp_010104": {
                    title: "发动机熄火，进入失败",
                    chineseName: "发动机熄火时尝试进入拆装工况",
                    precondition: {
                        zh: "1.手柄中位",
                        code: "LMIFault_Code1=0",
                        expected: "b_SetUp_Valid==0"
                    },
                    testSteps: [
                        { zh: "发动机转速=0", code: "w_Engine_Speed=0", expected: "" },
                        { zh: "按下拆装工况按键", code: "SetUp_bus_bPanel=1", expected: "" },
                        { zh: "等待500ms", code: "Wait 2000 ms", expected: "" },
                        { zh: "松开拆装工况按键", code: "SetUp_bus_bPanel=0", expected: "拆装工况未激活" },
                        { zh: "", code: "Wait 3000 ms", expected: "b_SetUp_Valid==0" }
                    ],
                    postcondition: {
                        zh: "恢复发动机转速",
                        code: "w_Engine_Speed=800",
                        expected: ""
                    }
                }
            }
        },
        // ===== 规则补全：未匹配项 + 每项的映射细节 =====
        rule: {
            issue: {
                stepId: "SetUp_010102 / Step 01",
                description: "手柄处于非中位状态",
                location: "位置：SetUp_0101 进入条件 / 手柄不在中位"
            },
            pendingItems: [
                {
                    id: "rule_1",
                    name: "手柄处于非中位状态",
                    type: "动作描述 → 变量赋值",
                    count: "4 节点",
                    active: true,
                    detail: {
                        zhInput: "手柄处于非中位状态",
                        codeOutput: "JoyR_swtPlt_IN=1",
                        ruleType: "状态映射",
                        explanation: "\"手柄\" 映射到变量 JoyR_swtPlt_IN\n\"非中位\" 映射到值 1（中位为 0）",
                        affectedSteps: [
                            { case: "SetUp_010102", step: "Step 1" },
                            { case: "SetUp_010103", step: "Precondition 隐含" },
                            { case: "SetUp_010104", step: "Precondition 隐含" }
                        ],
                        candidates: [
                            { code: "JoyR_swtPlt_IN=1", confidence: 95 },
                            { code: "JoyR_numBitsDem=1088", confidence: 72 },
                            { code: "JoyStick_Position != 0", confidence: 45 }
                        ]
                    }
                },
                {
                    id: "rule_2",
                    name: "按下拆装工况按键",
                    type: "操作动作 → 变量赋值",
                    count: "8 节点",
                    detail: {
                        zhInput: "按下拆装工况按键",
                        codeOutput: "SetUp_bus_bPanel=1",
                        ruleType: "操作映射",
                        explanation: "\"按下\" 映射到值 1\n\"拆装工况按键\" 映射到变量 SetUp_bus_bPanel",
                        affectedSteps: [
                            { case: "SetUp_010101", step: "Step 1" },
                            { case: "SetUp_010102", step: "Step 2" },
                            { case: "SetUp_010103", step: "Step 2" },
                            { case: "SetUp_010104", step: "Step 2" }
                        ],
                        candidates: [
                            { code: "SetUp_bus_bPanel=1", confidence: 98 }
                        ]
                    }
                },
                {
                    id: "rule_3",
                    name: "松开拆装工况按键",
                    type: "操作动作 → 变量赋值",
                    count: "8 节点",
                    detail: {
                        zhInput: "松开拆装工况按键",
                        codeOutput: "SetUp_bus_bPanel=0",
                        ruleType: "操作映射",
                        explanation: "\"松开\" 映射到值 0（与\"按下\"相反）\n\"拆装工况按键\" 映射到变量 SetUp_bus_bPanel",
                        affectedSteps: [
                            { case: "SetUp_010101", step: "Step 3" },
                            { case: "SetUp_010102", step: "Step 4" },
                            { case: "SetUp_010103", step: "Step 4" },
                            { case: "SetUp_010104", step: "Step 4" }
                        ],
                        candidates: [
                            { code: "SetUp_bus_bPanel=0", confidence: 98 }
                        ]
                    }
                },
                {
                    id: "rule_4",
                    name: "拆装工况未激活",
                    type: "期望结果 → 断言",
                    count: "3 节点",
                    detail: {
                        zhInput: "拆装工况未激活",
                        codeOutput: "b_SetUp_Valid==0",
                        ruleType: "结果断言",
                        explanation: "\"拆装工况\" 映射到变量 b_SetUp_Valid\n\"未激活\" 映射到断言值 ==0",
                        affectedSteps: [
                            { case: "SetUp_010102", step: "期望结果" },
                            { case: "SetUp_010103", step: "期望结果" },
                            { case: "SetUp_010104", step: "期望结果" }
                        ],
                        candidates: [
                            { code: "b_SetUp_Valid==0", confidence: 96 },
                            { code: "Assert b_SetUp_Valid == 0", confidence: 88 }
                        ]
                    }
                },
                {
                    id: "rule_5",
                    name: "等待500ms",
                    type: "时序动作 → 延时指令",
                    count: "4 节点",
                    detail: {
                        zhInput: "等待500ms",
                        codeOutput: "Wait 2000 ms",
                        ruleType: "时序映射",
                        explanation: "中文描述的 500ms 为用户操作间隔\n实际测试需要 2000ms 等待系统响应\n（系统延时配置：x4 倍率）",
                        affectedSteps: [
                            { case: "SetUp_010101", step: "Step 2" },
                            { case: "SetUp_010102", step: "Step 3" },
                            { case: "SetUp_010103", step: "Step 3" },
                            { case: "SetUp_010104", step: "Step 3" }
                        ],
                        candidates: [
                            { code: "Wait 2000 ms", confidence: 90 },
                            { code: "Wait 500 ms", confidence: 60 }
                        ]
                    }
                }
            ],
            samples: [
                { input: "拆装工况未激活", code: "b_SetUp_Valid==0", pass: true },
                { input: "手柄处于非中位状态", code: "JoyR_swtPlt_IN=1", pass: true },
                { input: "力限器传感器故障", code: "LMIFault_Code1=4359", pass: true }
            ]
        },
        // ===== 导出 =====
        exportData: {
            modules: [
                { name: "进入条件", icon: "🔑", total: 4, exportable: 4, progress: 100 },
                { name: "退出条件", icon: "🚪", total: 3, exportable: 3, progress: 100 },
                { name: "异常处理", icon: "⚠️", total: 2, exportable: 0, progress: 0, pending: 2 }
            ],
            history: [
                { time: "2026-06-08 14:30", file: "EN13000_SetUp_v1.2.xlsx", count: 7, user: "张工" },
                { time: "2026-06-07 09:15", file: "EN13000_SetUp_v1.1.xlsx", count: 4, user: "李工" }
            ]
        }
    },
    "TC-2026-022": {
        name: "力限器传感器故障",
        id: "TC-2026-022",
        status: "pending",
        statusLabel: "待补全",
        badges: [
            { text: "未匹配 5", type: "red" },
            { text: "待补全", type: "orange" }
        ],
        preview: {
            tree: [
                { id: "LMI_01", level: 1, label: "LMI_01 力限器系统测试", desc: "安全保护" },
                { id: "LMI_0101", level: 2, label: "LMI_0101 传感器故障检测", desc: "5 测试点" },
                { id: "LMI_010101", level: 3, label: "LMI_010101 主传感器断线", desc: "", result: "Passed" },
                { id: "LMI_010102", level: 3, label: "LMI_010102 副传感器断线", desc: "", result: "Passed" },
                { id: "LMI_010103", level: 3, label: "LMI_010103 双传感器同时故障", desc: "", result: "Failed" }
            ],
            steps: {
                "LMI_010101": {
                    title: "主传感器断线",
                    chineseName: "主力限器传感器信号丢失检测",
                    precondition: { zh: "1.系统正常运行", code: "LMI_Sensor1_OK=1", expected: "SystemReady==1" },
                    testSteps: [
                        { zh: "断开主传感器信号线", code: "LMI_Sensor1_Signal=0xFFFF", expected: "" },
                        { zh: "等待故障检测周期", code: "Wait 2000 ms", expected: "" },
                        { zh: "检查故障码输出", code: "Read FaultCode_LMI", expected: "FaultCode_LMI==0x03" },
                        { zh: "验证报警输出", code: "Read Buzzer_Active", expected: "Buzzer_Active==1" }
                    ],
                    postcondition: { zh: "恢复传感器信号", code: "LMI_Sensor1_Signal=0", expected: "" }
                },
                "LMI_010102": {
                    title: "副传感器断线",
                    chineseName: "副力限器传感器信号丢失检测",
                    precondition: { zh: "1.系统正常运行", code: "LMI_Sensor2_OK=1", expected: "SystemReady==1" },
                    testSteps: [
                        { zh: "断开副传感器信号线", code: "LMI_Sensor2_Signal=0xFFFF", expected: "" },
                        { zh: "等待故障检测周期", code: "Wait 2000 ms", expected: "" },
                        { zh: "检查故障码输出", code: "Read FaultCode_LMI", expected: "FaultCode_LMI==0x04" }
                    ],
                    postcondition: { zh: "恢复传感器信号", code: "LMI_Sensor2_Signal=0", expected: "" }
                },
                "LMI_010103": {
                    title: "双传感器同时故障",
                    chineseName: "两个力限器传感器同时故障的紧急保护",
                    precondition: { zh: "1.系统正常运行", code: "SystemReady=1", expected: "ProtectMode==0" },
                    testSteps: [
                        { zh: "同时断开双传感器", code: "LMI_Sensor1_Signal=0xFFFF\nLMI_Sensor2_Signal=0xFFFF", expected: "" },
                        { zh: "等待故障检测", code: "Wait 1000 ms", expected: "" },
                        { zh: "验证紧急停机", code: "Read EmergencyStop", expected: "EmergencyStop==1" },
                        { zh: "验证所有动作禁止", code: "Read AllAction_Disable", expected: "AllAction_Disable==1" }
                    ],
                    postcondition: { zh: "复位系统", code: "SystemReset=1", expected: "" }
                }
            }
        },
        rule: {
            issue: {
                stepId: "LMI_010103 / Step 03",
                description: "验证紧急停机信号输出",
                location: "位置：LMI_0101 传感器故障检测 / 双传感器故障"
            },
            pendingItems: [
                {
                    id: "lmi_rule_1", name: "断开主传感器信号线", type: "操作 → 变量赋值", count: "2 节点", active: true,
                    detail: {
                        zhInput: "断开主传感器信号线",
                        codeOutput: "LMI_Sensor1_Signal=0xFFFF",
                        ruleType: "硬件操作映射",
                        explanation: "\"断开\" 映射到信号值 0xFFFF（表示无效/断线）\n\"主传感器\" 映射到 LMI_Sensor1_Signal",
                        affectedSteps: [{ case: "LMI_010101", step: "Step 1" }, { case: "LMI_010103", step: "Step 1" }],
                        candidates: [{ code: "LMI_Sensor1_Signal=0xFFFF", confidence: 92 }]
                    }
                },
                {
                    id: "lmi_rule_2", name: "验证紧急停机", type: "期望结果 → 断言", count: "1 节点",
                    detail: {
                        zhInput: "验证紧急停机",
                        codeOutput: "EmergencyStop==1",
                        ruleType: "结果断言",
                        explanation: "\"紧急停机\" 映射到变量 EmergencyStop\n\"验证\" 表示断言，值为 1 表示已激活",
                        affectedSteps: [{ case: "LMI_010103", step: "Step 3" }],
                        candidates: [{ code: "EmergencyStop==1", confidence: 88 }, { code: "E_Stop_Active==1", confidence: 65 }]
                    }
                },
                {
                    id: "lmi_rule_3", name: "等待故障检测周期", type: "时序 → 延时", count: "3 节点",
                    detail: {
                        zhInput: "等待故障检测周期",
                        codeOutput: "Wait 2000 ms",
                        ruleType: "时序映射",
                        explanation: "\"故障检测周期\" 对应系统配置的检测间隔 2000ms",
                        affectedSteps: [{ case: "LMI_010101", step: "Step 2" }, { case: "LMI_010102", step: "Step 2" }, { case: "LMI_010103", step: "Step 2" }],
                        candidates: [{ code: "Wait 2000 ms", confidence: 85 }, { code: "Wait 1000 ms", confidence: 50 }]
                    }
                }
            ],
            samples: [
                { input: "断开主传感器信号线", code: "LMI_Sensor1_Signal=0xFFFF", pass: true },
                { input: "验证紧急停机", code: "EmergencyStop==1", pass: false },
                { input: "等待故障检测周期", code: "Wait 2000 ms", pass: true }
            ]
        },
        exportData: {
            modules: [
                { name: "故障检测", icon: "⚠️", total: 3, exportable: 2, progress: 66, pending: 1 },
                { name: "保护响应", icon: "🛡️", total: 2, exportable: 2, progress: 100 }
            ],
            history: [{ time: "2026-06-07 16:20", file: "LMI_Sensor_v0.3.xlsx", count: 4, user: "王工" }]
        }
    },
    "TC-2026-023": {
        name: "电源管理记忆",
        id: "TC-2026-023",
        status: "export",
        statusLabel: "可导出",
        badges: [{ text: "全部通过", type: "green" }, { text: "可导出", type: "green" }],
        preview: {
            tree: [
                { id: "PWR_01", level: 1, label: "PWR_01 电源管理", desc: "电气系统" },
                { id: "PWR_0101", level: 2, label: "PWR_0101 上电流程", desc: "4 测试点" },
                { id: "PWR_010101", level: 3, label: "PWR_010101 正常上电", desc: "", result: "Passed" },
                { id: "PWR_010102", level: 3, label: "PWR_010102 低电压上电", desc: "", result: "Passed" }
            ],
            steps: {
                "PWR_010101": {
                    title: "正常上电",
                    chineseName: "正常电压条件下系统上电",
                    precondition: { zh: "电池电压 24V", code: "V_Battery=24.0", expected: "" },
                    testSteps: [
                        { zh: "接通钥匙开关", code: "KeySwitch=1", expected: "" },
                        { zh: "等待系统初始化", code: "Wait 3000 ms", expected: "" },
                        { zh: "验证记忆数据恢复", code: "Read PowerMem_Restore", expected: "PowerMem_Restore==1" },
                        { zh: "验证上次模式恢复", code: "Read LastMode", expected: "LastMode==SavedMode" }
                    ],
                    postcondition: { zh: "断开钥匙开关", code: "KeySwitch=0", expected: "" }
                },
                "PWR_010102": {
                    title: "低电压上电",
                    chineseName: "电池电压偏低时上电保护",
                    precondition: { zh: "电池电压 18V", code: "V_Battery=18.0", expected: "" },
                    testSteps: [
                        { zh: "接通钥匙开关", code: "KeySwitch=1", expected: "" },
                        { zh: "等待系统响应", code: "Wait 2000 ms", expected: "" },
                        { zh: "验证低压报警", code: "Read LowVoltage_Alarm", expected: "LowVoltage_Alarm==1" },
                        { zh: "验证功能受限", code: "Read FunctionLimit", expected: "FunctionLimit==1" }
                    ],
                    postcondition: { zh: "恢复电压", code: "V_Battery=24.0", expected: "" }
                }
            }
        },
        rule: {
            issue: { stepId: "无未匹配项", description: "所有规则已匹配完毕，无需补全", location: "" },
            pendingItems: [],
            samples: [
                { input: "接通钥匙开关", code: "KeySwitch=1", pass: true },
                { input: "验证记忆数据恢复", code: "PowerMem_Restore==1", pass: true },
                { input: "验证低压报警", code: "LowVoltage_Alarm==1", pass: true }
            ]
        },
        exportData: {
            modules: [
                { name: "上电流程", icon: "🔋", total: 2, exportable: 2, progress: 100 },
                { name: "断电保护", icon: "⚡", total: 3, exportable: 3, progress: 100 }
            ],
            history: [
                { time: "2026-06-08 10:00", file: "PowerMgmt_v2.0.xlsx", count: 5, user: "张工" }
            ]
        }
    },
    "TC-2026-024": {
        name: "发动机低转速保护",
        id: "TC-2026-024",
        status: "processing",
        statusLabel: "处理中",
        badges: [{ text: "处理中", type: "blue" }, { text: "解析 60%", type: "orange" }],
        preview: {
            tree: [
                { id: "ENG_01", level: 1, label: "ENG_01 发动机管理", desc: "动力系统" },
                { id: "ENG_0101", level: 2, label: "ENG_0101 转速保护", desc: "4 测试点" },
                { id: "ENG_010101", level: 3, label: "ENG_010101 低转速禁止起升", desc: "", result: "Passed" },
                { id: "ENG_010102", level: 3, label: "ENG_010102 低转速禁止回转", desc: "", result: "Pending" }
            ],
            steps: {
                "ENG_010101": {
                    title: "低转速禁止起升",
                    chineseName: "发动机转速不足时禁止起升动作",
                    precondition: { zh: "发动机已启动", code: "EngineRunning=1", expected: "n_Engine_Speed>0" },
                    testSteps: [
                        { zh: "设置转速为500rpm", code: "n_Engine_Speed=500", expected: "" },
                        { zh: "尝试起升动作", code: "HoistUp_Cmd=1", expected: "" },
                        { zh: "验证起升被禁止", code: "Read HoistUp_Valve", expected: "HoistUp_Valve==0" },
                        { zh: "验证低转速报警", code: "Read Warning_LowRPM", expected: "Warning_LowRPM==1" }
                    ],
                    postcondition: { zh: "恢复转速", code: "n_Engine_Speed=800", expected: "" }
                },
                "ENG_010102": {
                    title: "低转速禁止回转",
                    chineseName: "发动机转速不足时禁止回转动作",
                    precondition: { zh: "发动机已启动", code: "EngineRunning=1", expected: "n_Engine_Speed>0" },
                    testSteps: [
                        { zh: "设置转速为400rpm", code: "n_Engine_Speed=400", expected: "" },
                        { zh: "尝试回转动作", code: "Swing_Cmd=1", expected: "" },
                        { zh: "验证回转被禁止", code: "Read Swing_Valve", expected: "Swing_Valve==0" }
                    ],
                    postcondition: { zh: "恢复转速", code: "n_Engine_Speed=800", expected: "" }
                }
            }
        },
        rule: {
            issue: { stepId: "ENG_010101 / Step 03", description: "验证起升动作被低转速保护禁止", location: "位置：ENG_0101 转速保护" },
            pendingItems: [
                {
                    id: "eng_rule_1", name: "尝试起升动作", type: "操作 → 指令输出", count: "2 节点", active: true,
                    detail: {
                        zhInput: "尝试起升动作", codeOutput: "HoistUp_Cmd=1", ruleType: "操作映射",
                        explanation: "\"起升\" 映射到 HoistUp 相关变量\n\"尝试\" 表示发送指令，Cmd=1",
                        affectedSteps: [{ case: "ENG_010101", step: "Step 2" }],
                        candidates: [{ code: "HoistUp_Cmd=1", confidence: 95 }]
                    }
                },
                {
                    id: "eng_rule_2", name: "验证起升被禁止", type: "结果 → 断言", count: "1 节点",
                    detail: {
                        zhInput: "验证起升被禁止", codeOutput: "HoistUp_Valve==0", ruleType: "结果断言",
                        explanation: "\"被禁止\" 表示阀输出为 0\n\"起升\" 映射到 HoistUp_Valve",
                        affectedSteps: [{ case: "ENG_010101", step: "Step 3" }],
                        candidates: [{ code: "HoistUp_Valve==0", confidence: 92 }, { code: "HoistUp_Enable==0", confidence: 78 }]
                    }
                }
            ],
            samples: [
                { input: "设置转速为500rpm", code: "n_Engine_Speed=500", pass: true },
                { input: "验证起升被禁止", code: "HoistUp_Valve==0", pass: true }
            ]
        },
        exportData: {
            modules: [{ name: "转速保护", icon: "🔧", total: 2, exportable: 1, progress: 50, pending: 1 }],
            history: []
        }
    },
    "TC-2026-025": {
        name: "高度限位器校验",
        id: "TC-2026-025", status: "review", statusLabel: "审核中",
        badges: [{ text: "审核中", type: "purple" }, { text: "规则待审核 2", type: "orange" }],
        preview: {
            tree: [
                { id: "HGT_01", level: 1, label: "HGT_01 安全限位", desc: "安全保护" },
                { id: "HGT_0101", level: 2, label: "HGT_0101 高度限位", desc: "3 测试点" },
                { id: "HGT_010101", level: 3, label: "HGT_010101 上限位触发", desc: "", result: "Passed" },
                { id: "HGT_010102", level: 3, label: "HGT_010102 限位恢复", desc: "", result: "Passed" }
            ],
            steps: {
                "HGT_010101": {
                    title: "上限位触发", chineseName: "起升达到限位高度时停止",
                    precondition: { zh: "起重臂已伸出", code: "BoomExtend_Pos=50", expected: "HeightSensor_OK==1" },
                    testSteps: [
                        { zh: "起升至接近限位", code: "HoistHeight=LimitHeight-0.5", expected: "" },
                        { zh: "继续起升", code: "HoistUp_Cmd=1\nWait 2000 ms", expected: "" },
                        { zh: "验证起升停止", code: "Read HoistUp_Stop", expected: "HoistUp_Stop==1" },
                        { zh: "验证报警", code: "Read Alarm_HeightLimit", expected: "Alarm_HeightLimit==1" }
                    ],
                    postcondition: { zh: "下降恢复", code: "HoistDn_Cmd=1\nWait 1000 ms", expected: "" }
                },
                "HGT_010102": {
                    title: "限位恢复", chineseName: "离开限位区域后恢复动作",
                    precondition: { zh: "处于限位状态", code: "HoistUp_Stop=1", expected: "Alarm_HeightLimit==1" },
                    testSteps: [
                        { zh: "下降一段距离", code: "HoistDn_Cmd=1\nWait 3000 ms", expected: "" },
                        { zh: "验证限位解除", code: "Read HoistUp_Stop", expected: "HoistUp_Stop==0" },
                        { zh: "验证可以起升", code: "HoistUp_Cmd=1", expected: "HoistUp_Valve==1" }
                    ],
                    postcondition: { zh: "停止动作", code: "HoistUp_Cmd=0", expected: "" }
                }
            }
        },
        rule: {
            issue: { stepId: "HGT_010101 / Step 03", description: "起升高度达到限位值时停止", location: "位置：HGT_0101 高度限位" },
            pendingItems: [
                {
                    id: "hgt_rule_1", name: "起升至接近限位", type: "操作 → 参数设置", count: "1 节点", active: true,
                    detail: {
                        zhInput: "起升至接近限位", codeOutput: "HoistHeight=LimitHeight-0.5", ruleType: "参数映射",
                        explanation: "\"接近限位\" 使用系统参数 LimitHeight 减去安全余量 0.5",
                        affectedSteps: [{ case: "HGT_010101", step: "Step 1" }],
                        candidates: [{ code: "HoistHeight=LimitHeight-0.5", confidence: 85 }]
                    }
                }
            ],
            samples: [
                { input: "验证起升停止", code: "HoistUp_Stop==1", pass: true },
                { input: "验证报警", code: "Alarm_HeightLimit==1", pass: true }
            ]
        },
        exportData: {
            modules: [{ name: "高度限位", icon: "📏", total: 2, exportable: 2, progress: 100 }],
            history: [{ time: "2026-06-06 11:00", file: "HeightLimit_v1.0.xlsx", count: 2, user: "李工" }]
        }
    },
    "TC-2026-026": {
        name: "回转制动系统",
        id: "TC-2026-026", status: "export", statusLabel: "可导出",
        badges: [{ text: "全部通过", type: "green" }, { text: "可导出", type: "green" }],
        preview: {
            tree: [
                { id: "SWG_01", level: 1, label: "SWG_01 回转系统", desc: "运动控制" },
                { id: "SWG_0101", level: 2, label: "SWG_0101 制动控制", desc: "3 测试点" },
                { id: "SWG_010101", level: 3, label: "SWG_010101 正常制动", desc: "", result: "Passed" }
            ],
            steps: {
                "SWG_010101": {
                    title: "正常制动", chineseName: "回转松手后制动响应",
                    precondition: { zh: "回转速度>0", code: "Swing_Speed=50", expected: "Brake_Ready==1" },
                    testSteps: [
                        { zh: "释放回转手柄", code: "Swing_Cmd=0", expected: "" },
                        { zh: "等待制动响应", code: "Wait 500 ms", expected: "" },
                        { zh: "验证制动激活", code: "Read Swing_Brake", expected: "Swing_Brake==1" },
                        { zh: "验证速度归零", code: "Wait 2000 ms\nRead Swing_Speed", expected: "Swing_Speed==0" }
                    ],
                    postcondition: { zh: "释放制动", code: "Swing_Brake=0", expected: "" }
                }
            }
        },
        rule: {
            issue: { stepId: "无未匹配项", description: "所有规则已匹配完毕", location: "" },
            pendingItems: [],
            samples: [{ input: "释放回转手柄", code: "Swing_Cmd=0", pass: true }, { input: "验证制动激活", code: "Swing_Brake==1", pass: true }]
        },
        exportData: {
            modules: [{ name: "制动控制", icon: "🔴", total: 1, exportable: 1, progress: 100 }],
            history: [{ time: "2026-06-08 09:00", file: "SwingBrake_v2.1.xlsx", count: 1, user: "张工" }]
        }
    },
    "TC-2026-027": {
        name: "变幅安全限位",
        id: "TC-2026-027", status: "processing", statusLabel: "处理中",
        badges: [{ text: "处理中", type: "blue" }, { text: "解析 35%", type: "orange" }],
        preview: {
            tree: [
                { id: "LUF_01", level: 1, label: "LUF_01 变幅系统", desc: "臂架控制" },
                { id: "LUF_0101", level: 2, label: "LUF_0101 变幅限位", desc: "4 测试点" },
                { id: "LUF_010101", level: 3, label: "LUF_010101 最大仰角限位", desc: "", result: "Pending" },
                { id: "LUF_010102", level: 3, label: "LUF_010102 最小仰角限位", desc: "", result: "Pending" }
            ],
            steps: {
                "LUF_010101": {
                    title: "最大仰角限位", chineseName: "变幅仰角超限时停止",
                    precondition: { zh: "变幅系统就绪", code: "Luff_System_Active=1", expected: "AngleSensor_OK==1" },
                    testSteps: [
                        { zh: "变幅至接近限位角度", code: "Luff_Angle=78", expected: "" },
                        { zh: "继续变幅", code: "Luff_Up_Cmd=1\nWait 3000 ms", expected: "" },
                        { zh: "验证变幅停止", code: "Read Luff_Stop", expected: "Luff_Stop==1" },
                        { zh: "验证角度报警", code: "Read Alarm_AngleLimit", expected: "Alarm_AngleLimit==1" }
                    ],
                    postcondition: { zh: "恢复角度", code: "Luff_Dn_Cmd=1\nWait 2000 ms", expected: "" }
                },
                "LUF_010102": {
                    title: "最小仰角限位", chineseName: "变幅下降超限时停止",
                    precondition: { zh: "变幅系统就绪", code: "Luff_System_Active=1", expected: "AngleSensor_OK==1" },
                    testSteps: [
                        { zh: "变幅下降至低角度", code: "Luff_Angle=5", expected: "" },
                        { zh: "继续下降", code: "Luff_Dn_Cmd=1\nWait 3000 ms", expected: "" },
                        { zh: "验证下降停止", code: "Read Luff_Dn_Stop", expected: "Luff_Dn_Stop==1" }
                    ],
                    postcondition: { zh: "恢复角度", code: "Luff_Up_Cmd=1\nWait 2000 ms", expected: "" }
                }
            }
        },
        rule: {
            issue: { stepId: "LUF_010101 / Step 03", description: "变幅角度超限时停止动作", location: "位置：LUF_0101 变幅限位" },
            pendingItems: [
                {
                    id: "luf_rule_1", name: "变幅至接近限位角度", type: "操作 → 参数设置", count: "2 节点", active: true,
                    detail: {
                        zhInput: "变幅至接近限位角度", codeOutput: "Luff_Angle=78", ruleType: "参数映射",
                        explanation: "\"接近限位角度\" 使用系统配置值 80° 减去安全余量 2°",
                        affectedSteps: [{ case: "LUF_010101", step: "Step 1" }],
                        candidates: [{ code: "Luff_Angle=78", confidence: 88 }, { code: "Luff_Angle=MaxAngle-2", confidence: 75 }]
                    }
                },
                {
                    id: "luf_rule_2", name: "验证变幅停止", type: "结果 → 断言", count: "1 节点",
                    detail: {
                        zhInput: "验证变幅停止", codeOutput: "Luff_Stop==1", ruleType: "结果断言",
                        explanation: "\"变幅停止\" 映射到 Luff_Stop 变量\n值为 1 表示已停止",
                        affectedSteps: [{ case: "LUF_010101", step: "Step 3" }],
                        candidates: [{ code: "Luff_Stop==1", confidence: 93 }]
                    }
                }
            ],
            samples: [{ input: "验证变幅停止", code: "Luff_Stop==1", pass: true }]
        },
        exportData: {
            modules: [{ name: "变幅限位", icon: "📐", total: 2, exportable: 0, progress: 0, pending: 2 }],
            history: []
        }
    }
};
