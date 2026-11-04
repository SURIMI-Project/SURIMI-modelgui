import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from surimi.v1 import regulation_pb2 as _regulation_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class UpdateRegulationsRequest(_message.Message):
    __slots__ = ("simulation_id", "start_date_time", "end_date_time", "regulations_summary")
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    START_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    END_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    REGULATIONS_SUMMARY_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    start_date_time: _timestamp_pb2.Timestamp
    end_date_time: _timestamp_pb2.Timestamp
    regulations_summary: _regulation_pb2.RegulationsSummary
    def __init__(self, simulation_id: _Optional[str] = ..., start_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., end_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., regulations_summary: _Optional[_Union[_regulation_pb2.RegulationsSummary, _Mapping]] = ...) -> None: ...

class UpdateRegulationsResponse(_message.Message):
    __slots__ = ("simulation_id",)
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    def __init__(self, simulation_id: _Optional[str] = ...) -> None: ...
