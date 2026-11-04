import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class SimulateStepRequest(_message.Message):
    __slots__ = ("simulation_id", "current_date_time")
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    CURRENT_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    current_date_time: _timestamp_pb2.Timestamp
    def __init__(self, simulation_id: _Optional[str] = ..., current_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class SimulateStepResponse(_message.Message):
    __slots__ = ("simulation_id",)
    SIMULATION_ID_FIELD_NUMBER: _ClassVar[int]
    simulation_id: str
    def __init__(self, simulation_id: _Optional[str] = ...) -> None: ...
