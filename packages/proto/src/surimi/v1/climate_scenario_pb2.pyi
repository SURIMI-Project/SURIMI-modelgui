from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class ClimateScenario(_message.Message):
    __slots__ = ("climate_scenario_code",)
    CLIMATE_SCENARIO_CODE_FIELD_NUMBER: _ClassVar[int]
    climate_scenario_code: str
    def __init__(self, climate_scenario_code: _Optional[str] = ...) -> None: ...
