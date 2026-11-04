from buf.validate import validate_pb2 as _validate_pb2
from surimi.v1 import simulation_pb2 as _simulation_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class GetSimulationContractRequest(_message.Message):
    __slots__ = ("scenario_name",)
    SCENARIO_NAME_FIELD_NUMBER: _ClassVar[int]
    scenario_name: str
    def __init__(self, scenario_name: _Optional[str] = ...) -> None: ...

class GetSimulationContractResponse(_message.Message):
    __slots__ = ("simulation",)
    SIMULATION_FIELD_NUMBER: _ClassVar[int]
    simulation: _simulation_pb2.Simulation
    def __init__(self, simulation: _Optional[_Union[_simulation_pb2.Simulation, _Mapping]] = ...) -> None: ...
