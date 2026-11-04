from surimi.v1 import unit_pb2 as _unit_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Measurement(_message.Message):
    __slots__ = ("system", "units")
    SYSTEM_FIELD_NUMBER: _ClassVar[int]
    UNITS_FIELD_NUMBER: _ClassVar[int]
    system: str
    units: _containers.RepeatedCompositeFieldContainer[_unit_pb2.Unit]
    def __init__(self, system: _Optional[str] = ..., units: _Optional[_Iterable[_Union[_unit_pb2.Unit, _Mapping]]] = ...) -> None: ...
