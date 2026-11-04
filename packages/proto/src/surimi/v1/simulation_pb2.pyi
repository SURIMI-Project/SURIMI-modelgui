import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from surimi.v1 import geography_pb2 as _geography_pb2
from surimi.v1 import items_pb2 as _items_pb2
from surimi.v1 import standards_pb2 as _standards_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Simulation(_message.Message):
    __slots__ = ("case_study_name", "start_date_time", "maximum_end_date_time", "time_step", "geography", "standards", "items")
    CASE_STUDY_NAME_FIELD_NUMBER: _ClassVar[int]
    START_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    MAXIMUM_END_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    TIME_STEP_FIELD_NUMBER: _ClassVar[int]
    GEOGRAPHY_FIELD_NUMBER: _ClassVar[int]
    STANDARDS_FIELD_NUMBER: _ClassVar[int]
    ITEMS_FIELD_NUMBER: _ClassVar[int]
    case_study_name: str
    start_date_time: _timestamp_pb2.Timestamp
    maximum_end_date_time: _timestamp_pb2.Timestamp
    time_step: str
    geography: _geography_pb2.Geography
    standards: _standards_pb2.Standards
    items: _items_pb2.Items
    def __init__(self, case_study_name: _Optional[str] = ..., start_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., maximum_end_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., time_step: _Optional[str] = ..., geography: _Optional[_Union[_geography_pb2.Geography, _Mapping]] = ..., standards: _Optional[_Union[_standards_pb2.Standards, _Mapping]] = ..., items: _Optional[_Union[_items_pb2.Items, _Mapping]] = ...) -> None: ...
