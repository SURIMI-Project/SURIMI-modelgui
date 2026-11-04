from surimi.v1 import simulation_status_pb2 as _simulation_status_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class GetSimulationStatusesRequest(_message.Message):
    __slots__ = ("experiment_ids",)
    EXPERIMENT_IDS_FIELD_NUMBER: _ClassVar[int]
    experiment_ids: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, experiment_ids: _Optional[_Iterable[str]] = ...) -> None: ...

class GetSimulationStatusesResponse(_message.Message):
    __slots__ = ("simulation_statuses",)
    SIMULATION_STATUSES_FIELD_NUMBER: _ClassVar[int]
    simulation_statuses: _containers.RepeatedCompositeFieldContainer[_simulation_status_pb2.SimulationStatus]
    def __init__(self, simulation_statuses: _Optional[_Iterable[_Union[_simulation_status_pb2.SimulationStatus, _Mapping]]] = ...) -> None: ...
