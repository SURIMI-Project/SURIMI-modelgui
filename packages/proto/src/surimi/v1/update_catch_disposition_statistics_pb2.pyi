import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from surimi.v1 import disposition_statistics_pb2 as _disposition_statistics_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class UpdateCatchDispositionStatisticsRequest(_message.Message):
    __slots__ = ("experiment_id", "start_date_time", "end_date_time", "catch_disposition_statistics_summary")
    EXPERIMENT_ID_FIELD_NUMBER: _ClassVar[int]
    START_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    END_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    CATCH_DISPOSITION_STATISTICS_SUMMARY_FIELD_NUMBER: _ClassVar[int]
    experiment_id: str
    start_date_time: _timestamp_pb2.Timestamp
    end_date_time: _timestamp_pb2.Timestamp
    catch_disposition_statistics_summary: _disposition_statistics_pb2.CatchDispositionStatisticsSummary
    def __init__(self, experiment_id: _Optional[str] = ..., start_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., end_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., catch_disposition_statistics_summary: _Optional[_Union[_disposition_statistics_pb2.CatchDispositionStatisticsSummary, _Mapping]] = ...) -> None: ...

class UpdateCatchDispositionStatisticsResponse(_message.Message):
    __slots__ = ("experiment_id",)
    EXPERIMENT_ID_FIELD_NUMBER: _ClassVar[int]
    experiment_id: str
    def __init__(self, experiment_id: _Optional[str] = ...) -> None: ...
