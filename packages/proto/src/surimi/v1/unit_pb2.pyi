from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class Unit(_message.Message):
    __slots__ = ("quantity", "unit")
    QUANTITY_FIELD_NUMBER: _ClassVar[int]
    UNIT_FIELD_NUMBER: _ClassVar[int]
    quantity: str
    unit: str
    def __init__(self, quantity: _Optional[str] = ..., unit: _Optional[str] = ...) -> None: ...
