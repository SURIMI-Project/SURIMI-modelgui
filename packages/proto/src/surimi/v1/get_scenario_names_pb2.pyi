from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class GetScenarioNamesRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class GetScenarioNamesResponse(_message.Message):
    __slots__ = ("scenario_names",)
    SCENARIO_NAMES_FIELD_NUMBER: _ClassVar[int]
    scenario_names: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, scenario_names: _Optional[_Iterable[str]] = ...) -> None: ...
