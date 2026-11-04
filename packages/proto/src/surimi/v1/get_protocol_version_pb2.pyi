from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class GetProtocolVersionRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class GetProtocolVersionResponse(_message.Message):
    __slots__ = ("protocol_version",)
    PROTOCOL_VERSION_FIELD_NUMBER: _ClassVar[int]
    protocol_version: str
    def __init__(self, protocol_version: _Optional[str] = ...) -> None: ...
