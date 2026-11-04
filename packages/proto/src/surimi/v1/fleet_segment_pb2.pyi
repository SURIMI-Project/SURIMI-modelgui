from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class FleetSegment(_message.Message):
    __slots__ = ("gear_code", "vessel_length_class", "scale", "country_code", "model")
    GEAR_CODE_FIELD_NUMBER: _ClassVar[int]
    VESSEL_LENGTH_CLASS_FIELD_NUMBER: _ClassVar[int]
    SCALE_FIELD_NUMBER: _ClassVar[int]
    COUNTRY_CODE_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    gear_code: str
    vessel_length_class: str
    scale: str
    country_code: str
    model: str
    def __init__(self, gear_code: _Optional[str] = ..., vessel_length_class: _Optional[str] = ..., scale: _Optional[str] = ..., country_code: _Optional[str] = ..., model: _Optional[str] = ...) -> None: ...
