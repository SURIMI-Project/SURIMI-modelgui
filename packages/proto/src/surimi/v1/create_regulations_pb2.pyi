from surimi.v1 import regulation_definition_pb2 as _regulation_definition_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class CreateRegulationsRequest(_message.Message):
    __slots__ = ("simulation_id", "regulations_summary")
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    REGULATIONS_SUMMARY_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    regulations_summary: _regulation_definition_pb2.RegulationDefinitionsSummary
    def __init__(self, simulation_id: _Optional[str] = ..., regulations_summary: _Optional[_Union[_regulation_definition_pb2.RegulationDefinitionsSummary, _Mapping]] = ...) -> None: ...

class CreateRegulationsResponse(_message.Message):
    __slots__ = ("simulation_id",)
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    def __init__(self, simulation_id: _Optional[str] = ...) -> None: ...
