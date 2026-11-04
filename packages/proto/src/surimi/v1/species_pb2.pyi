from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class Species(_message.Message):
    __slots__ = ("species_code", "length_class", "age", "life_stage")
    SPECIES_CODE_FIELD_NUMBER: _ClassVar[int]
    LENGTH_CLASS_FIELD_NUMBER: _ClassVar[int]
    AGE_FIELD_NUMBER: _ClassVar[int]
    LIFE_STAGE_FIELD_NUMBER: _ClassVar[int]
    species_code: str
    length_class: str
    age: str
    life_stage: str
    def __init__(self, species_code: _Optional[str] = ..., length_class: _Optional[str] = ..., age: _Optional[str] = ..., life_stage: _Optional[str] = ...) -> None: ...
