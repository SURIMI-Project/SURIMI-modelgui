from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class PriceCategory(_message.Message):
    __slots__ = ("category_code",)
    CATEGORY_CODE_FIELD_NUMBER: _ClassVar[int]
    category_code: str
    def __init__(self, category_code: _Optional[str] = ...) -> None: ...
