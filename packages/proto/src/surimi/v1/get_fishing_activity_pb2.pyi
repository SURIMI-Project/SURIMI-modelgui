import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from surimi.v1 import fishing_activity_pb2 as _fishing_activity_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class GetFishingActivityRequest(_message.Message):
    __slots__ = ("simulation_id", "start_date_time", "end_date_time")
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    START_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    END_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    start_date_time: _timestamp_pb2.Timestamp
    end_date_time: _timestamp_pb2.Timestamp
    def __init__(self, simulation_id: _Optional[str] = ..., start_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., end_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class GetFishingActivityResponse(_message.Message):
    __slots__ = ("simulation_id", "start_date_time", "end_date_time", "fishing_activity_summary")
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    START_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    END_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    FISHING_ACTIVITY_SUMMARY_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    start_date_time: _timestamp_pb2.Timestamp
    end_date_time: _timestamp_pb2.Timestamp
    fishing_activity_summary: _fishing_activity_pb2.FishingActivitySummary
    def __init__(self, simulation_id: _Optional[str] = ..., start_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., end_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., fishing_activity_summary: _Optional[_Union[_fishing_activity_pb2.FishingActivitySummary, _Mapping]] = ...) -> None: ...
