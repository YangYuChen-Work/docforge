import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal, create_tables
from app.db.models import Project, DocumentTemplate, TemplateChapter
from app.config import SCENARIO1_TEMPLATE_PATH

PROJECTS = [
    {"id": "P001", "name": "80t 汽车起重机臂架优化项目", "code": "XG-ZX-2026-042", "model": "XCT80L7", "phase": "方案设计", "category": "起重机"},
    {"id": "P002", "name": "全地面起重机液压系统升级项目", "code": "XG-ZX-2026-031", "model": "XCA130", "phase": "需求冻结", "category": "起重机"},
    {"id": "P003", "name": "履带起重机转台结构轻量化项目", "code": "XG-ZX-2025-118", "model": "XGC260", "phase": "试制验证", "category": "起重机"},
    {"id": "P004", "name": "起重机智能安全监测系统", "code": "XG-ZX-2025-096", "model": "XCT55L6", "phase": "详细设计", "category": "起重机"},
    {"id": "P005", "name": "新能源动力底盘适配项目", "code": "XG-ZX-2025-071", "model": "XCA60_EV", "phase": "前期调研", "category": "新能源"},
]

TEMPLATES = [
    {"id": "T001", "name": "总体设计方案", "phase": "方案设计", "category": "设计类"},
    {"id": "T002", "name": "产品设计任务书", "phase": "立项/需求冻结", "category": "设计类"},
    {"id": "T003", "name": "结构设计说明书", "phase": "详细设计", "category": "设计类"},
    {"id": "T004", "name": "液压系统设计说明书", "phase": "详细设计", "category": "设计类"},
    {"id": "T005", "name": "市场需求分析报告", "phase": "前期调研", "category": "分析类"},
    {"id": "T006", "name": "试制验证方案", "phase": "样机试制", "category": "验证类"},
    {"id": "T007", "name": "设计评审材料", "phase": "评审归档", "category": "评审类"},
]

SCENARIO1_CHAPTERS = [
    {"id": "T100-CH01", "order_index": 1, "title": "产品概述", "material_types": "市场调研报告,技术可行性分析报告", "gen_instruction": "综合来源资料，简述产品定位和用途", "required": True},
    {"id": "T100-CH02", "order_index": 2, "title": "市场需求分析", "material_types": "市场调研报告,技术调研报告", "gen_instruction": "填写产品近年销量走势表（表1），分析市场规模和趋势", "required": True},
    {"id": "T100-CH03", "order_index": 3, "title": "客户需求分析", "material_types": "市场调研报告", "gen_instruction": "填写客户需求分析表（表2），列出客户群体和业务痛点", "required": True},
    {"id": "T100-CH04", "order_index": 4, "title": "竞品分析", "material_types": "市场调研报告,技术调研报告", "gen_instruction": "填写竞品分析表（表3），对比主要竞品关键配置和口碑", "required": True},
    {"id": "T100-CH05", "order_index": 5, "title": "质量问题分析", "material_types": "质量调研报告", "gen_instruction": "填写质量问题分析表（表4），列出历史质量问题和改进措施", "required": True},
    {"id": "T100-CH06", "order_index": 6, "title": "市场定位", "material_types": "产品营销策略报告", "gen_instruction": "填写产品市场定位表（表5），明确目标市场和定位策略", "required": True},
    {"id": "T100-CH07", "order_index": 7, "title": "产品卖点和优势", "material_types": "技术可行性分析报告,市场调研报告", "gen_instruction": "填写产品卖点和优势分析表（表6）", "required": True},
    {"id": "T100-CH08", "order_index": 8, "title": "功能性能定位", "material_types": "技术可行性分析报告,产品质量目标", "gen_instruction": "填写产品功能/性能定位表（表7），列出关键技术指标", "required": True},
    {"id": "T100-CH09", "order_index": 9, "title": "质量目标", "material_types": "产品质量目标", "gen_instruction": "填写产品开发质量目标表（表8）", "required": True},
    {"id": "T100-CH10", "order_index": 10, "title": "初步方案及技术可行性", "material_types": "技术可行性分析报告", "gen_instruction": "描述技术路线、关键参数和技术难点", "required": True},
    {"id": "T100-CH11", "order_index": 11, "title": "标准化综合要求", "material_types": "标准化综合要求", "gen_instruction": "列出适用的法规、国标、行标", "required": True},
    {"id": "T100-CH12", "order_index": 12, "title": "采购可行性", "material_types": "采购可行性分析报告,盈利分析报告", "gen_instruction": "描述关键物料、供应资源和采购风险", "required": True},
    {"id": "T100-CH13", "order_index": 13, "title": "制造可行性", "material_types": "制造可行性分析报告", "gen_instruction": "描述工序、工艺和制造困难点", "required": True},
    {"id": "T100-CH14", "order_index": 14, "title": "运输方案及要求", "material_types": "", "gen_instruction": "运输要求待用户填写", "required": False},
    {"id": "T100-CH15", "order_index": 15, "title": "营销策略", "material_types": "产品营销策略报告", "gen_instruction": "描述市场定位、销售策略和目标客户", "required": True},
    {"id": "T100-CH16", "order_index": 16, "title": "服务可行性", "material_types": "服务可行性分析报告", "gen_instruction": "【资料缺失：服务可行性分析报告.docx 未上传，此章节无法自动生成】", "required": True},
    {"id": "T100-CH17", "order_index": 17, "title": "样机验证计划", "material_types": "", "gen_instruction": "样机计划（表9）待用户填写", "required": False},
    {"id": "T100-CH18", "order_index": 18, "title": "资源需求", "material_types": "", "gen_instruction": "资源需求（表10）待用户填写", "required": False},
    {"id": "T100-CH19", "order_index": 19, "title": "项目研发投入预算", "material_types": "XVPM-项目预算-假数字.xlsx", "gen_instruction": "从 Excel 读取预算数据，填写研发投入表（表11）", "required": True},
    {"id": "T100-CH20", "order_index": 20, "title": "产品经济效益分析", "material_types": "盈利分析报告", "gen_instruction": "填写经济效益分析表（表12）", "required": True},
    {"id": "T100-CH21", "order_index": 21, "title": "产品开发周期和里程碑", "material_types": "XVPM-WBS里程碑.xlsx", "gen_instruction": "从 Excel 读取里程碑，填写开发计划表（表13）", "required": True},
    {"id": "T100-CH22", "order_index": 22, "title": "项目风险及应对措施", "material_types": "技术可行性分析报告,制造可行性分析报告,采购可行性分析报告", "gen_instruction": "填写风险及解决措施表（表14）", "required": True},
]


def seed():
    create_tables()
    db = SessionLocal()
    try:
        # Projects
        for p in PROJECTS:
            if not db.get(Project, p["id"]):
                db.add(Project(**p))

        # Standard templates
        for t in TEMPLATES:
            if not db.get(DocumentTemplate, t["id"]):
                db.add(DocumentTemplate(**t))

        # Scenario1 real Word template
        template = db.get(DocumentTemplate, "T100")
        if not template:
            tpl = DocumentTemplate(
                id="T100",
                name="产品开发立项暨设计和开发输入报告",
                phase="方案设计",
                category="设计类",
                source_path=str(SCENARIO1_TEMPLATE_PATH),
                version="1.0",
                enabled=True,
            )
            db.add(tpl)
            for ch_data in SCENARIO1_CHAPTERS:
                db.add(TemplateChapter(template_id="T100", **ch_data))
        else:
            template.source_path = str(SCENARIO1_TEMPLATE_PATH)

        db.commit()
        projects_count = db.query(Project).count()
        templates_count = db.query(DocumentTemplate).count()
        chapters_count = db.query(TemplateChapter).count()
        print(f"Seeded: {projects_count} projects, {templates_count} templates, {chapters_count} chapters")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
