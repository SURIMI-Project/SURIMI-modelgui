import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class ExperimentStepRequest(_message.Message):
    __slots__ = ("experiment_id", "current_date_time")
    EXPERIMENT_ID_FIELD_NUMBER: _ClassVar[int]
    CURRENT_DATE_TIME_FIELD_NUMBER: _ClassVar[int]
    experiment_id: str
    current_date_time: _timestamp_pb2.Timestamp
    def __init__(self, experiment_id: _Optional[str] = ..., current_date_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class ExperimentStepResponse(_message.Message):
    __slots__ = ("experiment_id",)
    EXPERIMENT_ID_FIELD_NUMBER: _ClassVar[int]
    experiment_id: str
    def __init__(self, experiment_id: _Optional[str] = ...) -> None: ...
