from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class DoubleStatistics(_message.Message):
    __slots__ = ("mean", "p05", "p95")
    MEAN_FIELD_NUMBER: _ClassVar[int]
    P05_FIELD_NUMBER: _ClassVar[int]
    P95_FIELD_NUMBER: _ClassVar[int]
    mean: float
    p05: float
    p95: float
    def __init__(self, mean: _Optional[float] = ..., p05: _Optional[float] = ..., p95: _Optional[float] = ...) -> None: ...
