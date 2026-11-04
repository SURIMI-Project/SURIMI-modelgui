import datetime

from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf import timestamp_pb2 as _timestamp_pb2
from surimi.v1 import simulation_pb2 as _simulation_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class InitialiseSimulationRequest(_message.Message):
    __slots__ = ("simulation_id", "simulation", "scenario_name", "end_date_time", "climate_scenario", "is_mse_run")
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    SIMULATION_FIELD_NUMBER: _ClassVar[int]
    SCENARIO_NAME_FIELD_NUMBER: _ClassVar[int]
    END_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    CLIMATE_SCENARIO_FIELD_NUMBER: _ClassVar[int]
    IS_MSE_RUN_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    simulation: _simulation_pb2.Simulation
    scenario_name: str
    end_date_time: _timestamp_pb2.Timestamp
    climate_scenario: str
    is_mse_run: bool
    def __init__(self, simulation_id: _Optional[str] = ..., simulation: _Optional[_Union[_simulation_pb2.Simulation, _Mapping]] = ..., scenario_name: _Optional[str] = ..., end_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., climate_scenario: _Optional[str] = ..., is_mse_run: _Optional[bool] = ...) -> None: ...

class InitialiseSimulationResponse(_message.Message):
    __slots__ = ("simulation_id",)
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    def __init__(self, simulation_id: _Optional[str] = ...) -> None: ...
