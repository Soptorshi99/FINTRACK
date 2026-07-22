from typing import Optional

from pydantic import BaseModel, Field


class VoiceExpenseRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=500)
    account_id: Optional[str] = None
