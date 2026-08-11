import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal, create_tables
from app.db.models import Project
from scripts.seed_demo_projects import seed

@pytest.fixture(autouse=True, scope="module")
def setup_db():
    create_tables()
    seed()

client = TestClient(app)

def test_list_projects():
    r = client.get("/api/projects")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 5
    ids = [p["id"] for p in data]
    assert "P001" in ids

def test_get_project():
    r = client.get("/api/projects/P001")
    assert r.status_code == 200
    assert r.json()["name"] == "80t 汽车起重机臂架优化项目"

def test_get_project_not_found():
    r = client.get("/api/projects/NOTEXIST")
    assert r.status_code == 404
