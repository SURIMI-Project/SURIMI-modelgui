import datetime

from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf import timestamp_pb2 as _timestamp_pb2
from surimi.v1 import regulation_definition_pb2 as _regulation_definition_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class SubmitExperimentRequest(_message.Message):
    __slots__ = ("scenario_name", "experiment_id", "end_date_time", "is_mse_run", "regulations_definitions_summary", "climate_scenario")
    SCENARIO_NAME_FIELD_NUMBER: _ClassVar[int]
    EXPERIMENT_ID_FIELD_NUMBER: _ClassVar[int]
    END_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    IS_MSE_RUN_FIELD_NUMBER: _ClassVar[int]
    REGULATIONS_DEFINITIONS_SUMMARY_FIELD_NUMBER: _ClassVar[int]
    CLIMATE_SCENARIO_FIELD_NUMBER: _ClassVar[int]
    scenario_name: str
    experiment_id: str
    end_date_time: _timestamp_pb2.Timestamp
    is_mse_run: bool
    regulations_definitions_summary: _regulation_definition_pb2.RegulationDefinitionsSummary
    climate_scenario: str
    def __init__(self, scenario_name: _Optional[str] = ..., experiment_id: _Optional[str] = ..., end_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., is_mse_run: _Optional[bool] = ..., regulations_definitions_summary: _Optional[_Union[_regulation_definition_pb2.RegulationDefinitionsSummary, _Mapping]] = ..., climate_scenario: _Optional[str] = ...) -> None: ...

class SubmitExperimentResponse(_message.Message):
    __slots__ = ("experiment_id",)
    EXPERIMENT_ID_FIELD_NUMBER: _ClassVar[int]
    experiment_id: str
    def __init__(self, experiment_id: _Optional[str] = ...) -> None: ...
