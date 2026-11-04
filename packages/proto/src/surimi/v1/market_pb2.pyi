from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class Market(_message.Message):
    __slots__ = ("market_code",)
    MARKET_CODE_FIELD_NUMBER: _ClassVar[int]
    market_code: str
    def __init__(self, market_code: _Optional[str] = ...) -> None: ...
