from typing import Optional, Dict
from pydantic import BaseModel, Field


class SystemStatus(BaseModel):
    api: str = Field("healthy", description="API operational status")
    database: str = Field("operational", description="Database connection status")
    environment: str = Field("development", description="Runtime environment")
    version: str = Field("0.1.0", description="Backend software version")


class HealthResponse(BaseModel):
    status: str = Field("healthy", description="Overall health state")
    timestamp: str = Field(..., description="UTC ISO8601 timestamp")
    project: str = Field("NEXORA", description="Project identity")
    tagline: str = Field("Learn it. See it. Try it. Apply it. Master it.")
    system: SystemStatus
    capabilities: Dict[str, bool] = Field(default_factory=dict)
