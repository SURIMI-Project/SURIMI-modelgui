import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from surimi.v1 import biomass_pb2 as _biomass_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class UpdateBiomassRequest(_message.Message):
    __slots__ = ("simulation_id", "date_time", "biomass_summary")
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    BIOMASS_SUMMARY_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    date_time: _timestamp_pb2.Timestamp
    biomass_summary: _biomass_pb2.BiomassSummary
    def __init__(self, simulation_id: _Optional[str] = ..., date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., biomass_summary: _Optional[_Union[_biomass_pb2.BiomassSummary, _Mapping]] = ...) -> None: ...

class UpdateBiomassResponse(_message.Message):
    __slots__ = ("simulation_id",)
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    def __init__(self, simulation_id: _Optional[str] = ...) -> None: ...
