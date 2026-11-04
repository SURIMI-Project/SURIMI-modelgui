from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class CoordinateReferenceSystem(_message.Message):
    __slots__ = ("name", "authority", "code")
    NAME_FIELD_NUMBER: _ClassVar[int]
    AUTHORITY_FIELD_NUMBER: _ClassVar[int]
    CODE_FIELD_NUMBER: _ClassVar[int]
    name: str
    authority: str
    code: str
    def __init__(self, name: _Optional[str] = ..., authority: _Optional[str] = ..., code: _Optional[str] = ...) -> None: ...
