import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from surimi.v1 import biomass_statistics_pb2 as _biomass_statistics_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class UpdateBiomassStatisticsRequest(_message.Message):
    __slots__ = ("experiment_id", "date_time", "biomass_statistics_summary")
    EXPERIMENT_ID_FIELD_NUMBER: _ClassVar[int]
    DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    BIOMASS_STATISTICS_SUMMARY_FIELD_NUMBER: _ClassVar[int]
    experiment_id: str
    date_time: _timestamp_pb2.Timestamp
    biomass_statistics_summary: _biomass_statistics_pb2.BiomassStatisticsSummary
    def __init__(self, experiment_id: _Optional[str] = ..., date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., biomass_statistics_summary: _Optional[_Union[_biomass_statistics_pb2.BiomassStatisticsSummary, _Mapping]] = ...) -> None: ...

class UpdateBiomassStatisticsResponse(_message.Message):
    __slots__ = ("experiment_id",)
    EXPERIMENT_ID_FIELD_NUMBER: _ClassVar[int]
    experiment_id: str
    def __init__(self, experiment_id: _Optional[str] = ...) -> None: ...
